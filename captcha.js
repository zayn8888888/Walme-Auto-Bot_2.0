const axios = require("axios");
const config = require("dotenv").config().parsed;
const fs = require("fs").promises;
const path = require("path");

// 内存缓存
let captchaCountCache = null;
const CACHE_FILE = path.join(__dirname, "captcha_count_cache.json");

const AddCaptchaNum = async () => {
  try {
    // 如果内存缓存不存在，从文件加载
    if (captchaCountCache === null) {
      await loadCacheFromFile();
    }

    const today = new Date().toISOString().split("T")[0];

    // 增加当日计数
    if (!captchaCountCache[today]) {
      captchaCountCache[today] = 0;
    }
    captchaCountCache[today]++;

    // 保存到文件
    await fs.writeFile(CACHE_FILE, JSON.stringify(captchaCountCache));
  } catch (error) {
    console.error("Error updating captcha count:", error);
  }
};

const loadCacheFromFile = async () => {
  try {
    const data = await fs.readFile(CACHE_FILE, "utf8");
    captchaCountCache = JSON.parse(data);
  } catch (error) {
    // 如果文件不存在或读取失败，初始化缓存
    captchaCountCache = {};
    await fs.writeFile(CACHE_FILE, JSON.stringify(captchaCountCache));
  }
};

const checkCaptchaNum = async () => {
  try {
    // 如果内存缓存不存在，从文件加载
    if (captchaCountCache === null) {
      await loadCacheFromFile();
    }

    const today = new Date().toISOString().split("T")[0];

    // 如果当天没有记录，初始化计数为0
    if (!captchaCountCache[today]) {
      captchaCountCache[today] = 0;
      await fs.writeFile(CACHE_FILE, JSON.stringify(captchaCountCache));
    }

    // 检查当日调用次数是否超过限制
    return captchaCountCache[today] < config.MAX_CAPTCHA_NUM_DAILY;
  } catch (error) {
    console.error("Error checking captcha count:", error);
    return false;
  }
};

/**
 * @param {Object} proxyInfo
 * @param {string} proxyInfo.host
 * @param {string} proxyInfo.port
 * @param {string?} proxyInfo.username
 * @param {string?} proxyInfo.password
 */
const solve2Captcha = async (proxyInfo) => {
  if (!checkCaptchaNum()) {
    console.error("captcha num exceed");
    // 终止程序
    process.exit(1);
    return null;
  }
  if (!config.API_KEY_2CAPTCHA) {
    console.error(
      "no 2CAPTCHA api key , please set it in .env file, API_KEY_2CAPTCHA"
    );
    // 终止程序
    process.exit(1);
    return null;
  }
  let retries = 3;
  try {
    // Step 1: Create a CAPTCHA task
    // socks5://xcacwxcm:7tk9cj63xr1d@130.180.234.214:7437
    const taskResponse = await axios.post(
      "https://api.2captcha.com/createTask",
      {
        clientKey: config.API_KEY_2CAPTCHA,
        task: {
          type: "RecaptchaV2Task",
          websiteURL: config.CAPTCHA_URL,
          websiteKey: config.WEBSITE_KEY,
          proxyType: "socks5",
          proxyAddress: proxyInfo.host,
          proxyPort: proxyInfo.port,
          proxyLogin: proxyInfo.username,
          proxyPassword: proxyInfo.password,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const requestId = taskResponse.data.taskId;
    // Step 2: Poll for the result
    let result;
    do {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const resultResponse = await axios.post(
        "https://api.2captcha.com/getTaskResult",
        {
          clientKey: config.API_KEY_2CAPTCHA,
          taskId: requestId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      result = resultResponse.data;
      if (result.status === "processing") {
        console.log("CAPTCHA still processing...");
      }
      retries--;
    } while (result.status === "processing" && retries > 0);

    // Step 3: Use the CAPTCHA solution
    if (result.status === "ready") {
      console.log("CAPTCHA success..");
      AddCaptchaNum();
      const captchaSolution = result.solution.token; // This is the CAPTCHA token
      return captchaSolution; // Store the token for further use

      // You can now send this token to the backend or use it as needed
    } else {
      console.error("Error:", result);
      return null;
    }
  } catch (error) {
    console.error("Error:", error.message);
    return null;
  }
};

module.exports = { solve2Captcha };
