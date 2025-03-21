const fs = require("fs").promises;
const axios = require("axios");
const SocksProxyAgent = require("socks-proxy-agent").SocksProxyAgent;
const HttpProxyAgent = require("http-proxy-agent").HttpProxyAgent;
const HttpsProxyAgent = require("https-proxy-agent").HttpsProxyAgent;
const { solve2Captcha } = require("./captcha.js");

let chalk;
(async () => {
  chalk = (await import("chalk")).default;
  runBot();
})();

const BASE_URL = "https://api.walme.io/waitlist/tasks";
const PROFILE_URL = "https://api.walme.io/user/profile";
const COMPLETED_TASKS_FILE = "completed_tasks.json";
const PROXIES_FILE = "proxies.txt";

async function getAccessTokens() {
  try {
    const tokenData = await fs.readFile("tokens.txt", "utf8");
    const tokens = tokenData
      .split("\n")
      .map((token) => token.trim())
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      throw new Error("No tokens found in tokens.txt");
    }
    return tokens;
  } catch (error) {
    console.error(
      chalk.red.bold(
        `[ERROR] Failed to read tokens from tokens.txt: ${error.message}`
      )
    );
    throw error;
  }
}

async function getProxies() {
  try {
    const proxyData = await fs.readFile(PROXIES_FILE, "utf8");
    const proxies = proxyData
      .split("\n")
      .map((proxy) => proxy.trim())
      .filter((proxy) => proxy.length > 0);

    if (proxies.length === 0) {
      console.log(
        chalk.yellow(
          `[WARNING] No proxies found in ${PROXIES_FILE}. Running without proxies.`
        )
      );
      return [];
    }

    console.log(
      chalk.white(
        `🌐 [INFO] Loaded ${proxies.length} proxies from ${PROXIES_FILE}`
      )
    );
    return proxies;
  } catch (error) {
    console.error(
      chalk.yellow(
        `[WARNING] Failed to read proxies from ${PROXIES_FILE}: ${error.message}. Running without proxies.`
      )
    );
    return [];
  }
}

function createProxyAgent(proxyString) {
  try {
    let protocol, host, port, auth;

    if (proxyString.includes("://")) {
      const url = new URL(proxyString);
      protocol = url.protocol.replace(":", "");
      host = url.hostname;
      port = url.port;
      auth =
        url.username && url.password ? `${url.username}:${url.password}` : null;
    } else {
      const parts = proxyString.split(":");
      if (parts.length >= 2) {
        if (parts.length === 2) {
          [host, port] = parts;
          protocol = "http";
        } else if (parts.length === 4) {
          [host, port, ...auth] = parts;
          auth = auth.join(":");
          protocol = "http";
        } else if (proxyString.includes("@")) {
          const [credentials, server] = proxyString.split("@");
          auth = credentials;
          [host, port] = server.split(":");
          protocol = "http";
        }
      }
    }

    if (!host || !port) {
      throw new Error(`Invalid proxy format: ${proxyString}`);
    }

    let proxyType = protocol?.toLowerCase() || "http";

    let httpAgent, httpsAgent;

    if (proxyType.startsWith("socks")) {
      const socksUrl = `socks${proxyType.endsWith("5") ? "5" : "4"}://${
        auth ? auth + "@" : ""
      }${host}:${port}`;
      httpAgent = new SocksProxyAgent(socksUrl, {
        rejectUnauthorized: false,
      });
      httpsAgent = new SocksProxyAgent(socksUrl, {
        rejectUnauthorized: false,
      });
    } else {
      const httpProxyUrl = `http://${auth ? auth + "@" : ""}${host}:${port}`;
      httpAgent = new HttpProxyAgent(httpProxyUrl, {
        rejectUnauthorized: false,
      });
      httpsAgent = new HttpsProxyAgent(httpProxyUrl, {
        rejectUnauthorized: false,
      });
    }
    return {
      port,
      host,
      username: auth ? auth.split(":")[0] : null,
      password: auth ? auth.split(":")[1] : null,
      http: httpAgent,
      https: httpsAgent,
    };
  } catch (error) {
    console.error(
      chalk.red.bold(`[ERROR] Failed to create proxy agent: ${error.message}`)
    );
    return null;
  }
}

async function getUserProfile(token, proxyAgent) {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    };

    if (proxyAgent) {
      if (proxyAgent.http && proxyAgent.https) {
        config.httpAgent = proxyAgent.http;
        config.httpsAgent = proxyAgent.https;
      } else {
        config.httpsAgent = proxyAgent;
        config.httpAgent = proxyAgent;
      }
    }

    const response = await axios.get(PROFILE_URL, config);
    const { email, nickname } = response.data;
    console.log(
      chalk.white(
        `✨ [INFO] Profile fetched - Email: ${email}, Nickname: ${nickname}`
      )
    );
    return { email, nickname };
  } catch (error) {
    console.error(
      chalk.red.bold(
        `[ERROR] Failed to fetch user profile: ${
          error.response?.data?.message || error.message
        }`
      )
    );
    throw error;
  }
}

async function getTasks(token, proxyAgent) {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    };

    if (proxyAgent) {
      if (proxyAgent.http && proxyAgent.https) {
        config.httpAgent = proxyAgent.http;
        config.httpsAgent = proxyAgent.https;
      } else {
        config.httpsAgent = proxyAgent;
        config.httpAgent = proxyAgent;
      }
    }

    const response = await axios.get(BASE_URL, config);
    return response.data;
  } catch (error) {
    console.error(
      chalk.red.bold(
        `[ERROR] Failed to fetch task list: ${
          error.response?.data?.message || error.message
        }`
      )
    );
    throw error;
  }
}

async function completeTask(taskId, token, proxyAgent) {
  try {
    console.log(
      chalk.white(`🔧 [INFO] Processing task ${taskId} - Fetching captcha...`)
    );
    const Recaptcha = await solve2Captcha(proxyAgent);
    if (Recaptcha) {
      console.log(chalk.green(`✅ [SUCCESS] 2Captcha solved: `));
    } else {
      console.log(chalk.red(`[ERROR] Failed to solve 2Captcha`));
      return null;
    }

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
        "Content-Type": "application/json",
        Origin: "https://waitlist.walme.io",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Priority: "u=1, i",
        Recaptcha,
        Referer: "https://waitlist.walme.io/",
        "Sec-Ch-Ua":
          '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0",
      },
    };

    if (proxyAgent) {
      if (proxyAgent.http && proxyAgent.https) {
        config.httpAgent = proxyAgent.http;
        config.httpsAgent = proxyAgent.https;
      } else {
        config.httpsAgent = proxyAgent;
        config.httpAgent = proxyAgent;
      }
    }

    const response = await axios.patch(`${BASE_URL}/${taskId}`, {}, config);
    console.log(
      chalk.green(
        `✅ [SUCCESS] Task ${taskId} processed: ${response.data.title}`
      )
    );
    return response.data;
  } catch (error) {
    console.error(
      chalk.red.bold(
        `[ERROR] Failed to process task ${taskId}: ${
          error.response?.data?.message || error.message
        }`
      )
    );
    throw error;
  }
}

async function loadCompletedTasks() {
  try {
    const data = await fs.readFile(COMPLETED_TASKS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveCompletedTasks(completedTasks) {
  try {
    await fs.writeFile(
      COMPLETED_TASKS_FILE,
      JSON.stringify(completedTasks, null, 2)
    );
  } catch (error) {
    console.error(
      chalk.red.bold(`[ERROR] Failed to save completed tasks: ${error.message}`)
    );
  }
}

function startCountdown() {
  const nextRun = new Date();
  // 20-24 random
  const nextHour = Math.floor(Math.random() * 5) + 20;
  nextRun.setHours(nextRun.getHours() + nextHour);
  const totalMs = nextHour * 60 * 60 * 1000;

  const interval = setInterval(() => {
    const now = new Date();
    const timeLeft = nextRun - now;

    if (timeLeft <= 0) {
      clearInterval(interval);
      console.log(
        chalk.blue.bold("🚀 [INFO] Countdown complete. Starting next run...")
      );
    } else {
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      const progress = Math.floor((1 - timeLeft / totalMs) * 10);
      const bar = "█".repeat(progress) + "░".repeat(10 - progress);

      process.stdout.write(
        `\r${chalk.yellow(
          "⏰ [INFO] Next run in:"
        )} ${hours}h ${minutes}m ${seconds}s ${chalk.white(`[${bar}]`)}`
      );
    }
  }, 1000);

  return nextRun;
}
//Bypass completed and the task which its status is failed needs to be real
const taskFilter = (task) =>
  !["started", "completed", "failed"].includes(task.status);

async function processAccount(token, proxyAgent) {
  try {
    console.log(chalk.white("👤 [INFO] Fetching user profile..."));
    const profile = await getUserProfile(token, proxyAgent);

    console.log(
      chalk.white(`📋 [INFO] ${profile.email} - Fetching task list...`)
    );
    const tasks = await getTasks(token, proxyAgent);
    console.log(
      chalk.white(
        `📋 [INFO] ${profile.email} - Task list fetched, total tasks: ${tasks.length}`
      )
    );

    const pendingTasks = tasks.filter(taskFilter);
    console.log(
      chalk.white(
        `📋 [INFO] ${profile.email} - New pending tasks: ${pendingTasks.length}`
      )
    );

    for (const task of pendingTasks) {
      console.log(
        chalk.yellow(
          `🔧 [INFO] ${profile.email} - Processing task: ${task.title} (ID: ${task.id})`
        )
      );

      if (task.child && task.child.length > 0) {
        for (const childTask of task.child) {
          if (taskFilter(childTask)) {
            await completeTask(childTask.id, token, proxyAgent);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } else {
        await completeTask(task.id, token, proxyAgent);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      chalk.green.bold(
        `🎉 [SUCCESS] ${profile.email} - All new tasks have been processed`
      )
    );
  } catch (error) {
    console.error(
      chalk.red.bold(`💥 [ERROR] Account processing failed: ${error.message}`)
    );
  }
}

async function runBot() {
  try {
    console.log(chalk.cyan.bold("═══════════════════════════════════════"));
    console.log(chalk.cyan.bold("   Walme Auto Bot - Airdrop Insiders   "));
    console.log(chalk.cyan.bold("═══════════════════════════════════════"));

    console.log(chalk.white("🔑 [INFO] Fetching access tokens..."));
    const tokens = await getAccessTokens();
    console.log(
      chalk.white(`🔑 [INFO] ${tokens.length} tokens fetched successfully`)
    );

    console.log(chalk.white("🌐 [INFO] Loading proxies..."));
    const proxies = await getProxies();

    // let completedTasks = await loadCompletedTasks();

    while (true) {
      console.log(chalk.cyan("─".repeat(40)));

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        let proxyAgent = null;
        if (proxies.length > 0) {
          const proxyIndex = i % proxies.length;
          const proxyString = proxies[proxyIndex];
          console.log(
            chalk.white(
              `🌐 [INFO] Using proxy: ${proxyString.replace(
                /:[^:]*@/,
                ":****@"
              )}`
            )
          );
          proxyAgent = createProxyAgent(proxyString);

          if (!proxyAgent) {
            console.log(
              chalk.yellow(
                `[WARNING] Failed to create proxy agent for: ${proxyString}. Continuing without proxy.`
              )
            );
          }
        }

        await processAccount(token, proxyAgent);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const nextRunTime = startCountdown();
      await new Promise((resolve) =>
        setTimeout(resolve, nextRunTime - new Date())
      );
      console.log("");
    }
  } catch (error) {
    console.error(
      chalk.red.bold(`💥 [ERROR] Bot execution failed: ${error.message}`)
    );
  }
}
