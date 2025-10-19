import express from "express";
import cron from "node-cron";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const loadEnvConfig = () => {
  try {
    const envPath = path.join(__dirname, "config.env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const envVars = {};
      envContent.split("\n").forEach((line) => {
        try {
          const [key, value] = line.split("=");
          if (key && value) {
            envVars[key.trim()] = value.trim();
          }
        } catch (lineError) {
          console.warn(
            `⚠️  Warning: Failed to parse config line: ${line}`,
            lineError.message
          );
        }
      });
      console.log("✅ Environment configuration loaded successfully");
      return envVars;
    }
    console.warn("⚠️  Warning: config.env file not found, using defaults");
    return {};
  } catch (error) {
    console.error("❌ Error loading environment configuration:", error.message);
    console.log("📝 Using default configuration values");
    return {};
  }
};

const config = loadEnvConfig();

// Configuration with validation and fallbacks
const getConfig = () => {
  try {
    let PORT = parseInt(config.PORT) || 3001;
    const RPC_URL =
      config.RPC_URL || "https://bsc-dataseed1.binance.org/";
    const CONTRACT_ADDRESS =
      config.CONTRACT_ADDRESS || "0x222Ace7B7B91D777A468B37aA9793341f4fa0a4e";
    const PRIVATE_KEY = config.PRIVATE_KEY || process.env.PRIVATE_KEY;
    const CRON_SCHEDULE = config.CRON_SCHEDULE || "0 0 * * *"; // Every 1 day at midnight (12 AM)
    let BATCH_SIZE = parseInt(config.BATCH_SIZE) || 100;

    // Validate configuration with warnings instead of errors
    if (PORT < 1 || PORT > 65535) {
      console.warn(`⚠️  Invalid PORT: ${PORT}. Using default port 3001`);
      PORT = 3001;
    }
    if (BATCH_SIZE < 1 || BATCH_SIZE > 1000) {
      console.warn(
        `⚠️  Invalid BATCH_SIZE: ${BATCH_SIZE}. Using default batch size 100`
      );
      BATCH_SIZE = 100;
    }

    return {
      PORT,
      RPC_URL,
      CONTRACT_ADDRESS,
      PRIVATE_KEY,
      CRON_SCHEDULE,
      BATCH_SIZE,
    };
  } catch (configError) {
    console.error("❌ Configuration validation failed:", configError.message);
    console.log("📝 Using default configuration values");
    return {
      PORT: 3001,
      RPC_URL: "https://bsc-dataseed1.binance.org/",
      CONTRACT_ADDRESS: "0x222Ace7B7B91D777A468B37aA9793341f4fa0a4e",
      PRIVATE_KEY: process.env.PRIVATE_KEY,
      CRON_SCHEDULE: "0 0 * * *",
      BATCH_SIZE: 100,
    };
  }
};

// Get configuration with proper validation
const configValues = getConfig();
const {
  PORT,
  RPC_URL,
  CONTRACT_ADDRESS,
  PRIVATE_KEY,
  CRON_SCHEDULE,
  BATCH_SIZE,
} = configValues;

// Contract ABI (from contract.js)
const ABI = [
  {
    inputs: [
      { internalType: "address", name: "initialOwner", type: "address" },
      { internalType: "address", name: "_token", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "package",
        type: "uint256",
      },
    ],
    name: "LevelPurchased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
    ],
    name: "Registration",
    type: "event",
  },
  {
    inputs: [],
    name: "MAX_ROI",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "buyDiamondPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyElitePack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyGalaxyPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyGoldPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyInfinityPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyLegendPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyMegaPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyPlatinumPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyPremiumPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyProPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyRoyalPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buySilverPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyStaterPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyTitanPack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_user", type: "address" },
      { internalType: "uint256", name: "_index", type: "uint256" },
    ],
    name: "calculateClaimAbles",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_directIncome", type: "uint256" },
    ],
    name: "changeDirectPercentage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractPercent",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "directIncome",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "distributeRewardsToAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "distributor",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getUSersLengh",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserReferrers",
    outputs: [
      { internalType: "address[]", name: "", type: "address[]" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getallstakereward",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
    name: "liquidity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "packagePrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "percentDivider",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "ref", type: "address" }],
    name: "registration",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "roiPercent",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "stakeRecord",
    outputs: [
      { internalType: "uint256", name: "packageIndex", type: "uint256" },
      { internalType: "uint256", name: "lasClaimTime", type: "uint256" },
      { internalType: "uint256", name: "rewardClaimed", type: "uint256" },
      { internalType: "uint256", name: "claimable", type: "uint256" },
      { internalType: "uint256", name: "maxRoi", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "uniqueUsers",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_distributor", type: "address" },
    ],
    name: "updateDistributor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "index", type: "uint256" },
      { internalType: "uint256", name: "newPercent", type: "uint256" },
    ],
    name: "updateRoiPercent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "userRecord",
    outputs: [
      { internalType: "uint256", name: "totalInvestment", type: "uint256" },
      { internalType: "uint256", name: "directBusiness", type: "uint256" },
      { internalType: "address", name: "referrer", type: "address" },
      { internalType: "uint256", name: "referrerBonus", type: "uint256" },
      { internalType: "uint256", name: "totalWithdrawn", type: "uint256" },
      { internalType: "bool", name: "isRegistered", type: "bool" },
      { internalType: "uint256", name: "stakeCount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_index", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

// Web3 Setup
let provider, wallet, contract;

const initializeWeb3 = async (retryCount = 0, maxRetries = 3) => {
  try {
    if (!PRIVATE_KEY || PRIVATE_KEY === "your_private_key_here") {
      console.warn(
        "⚠️  Private key not provided or using placeholder. Web3 features will be limited."
      );
      console.log(
        "📝 To enable full functionality, set a valid PRIVATE_KEY in config.env"
      );
      return false;
    }

    console.log(
      `🔄 Initializing Web3 connection (attempt ${retryCount + 1}/${
        maxRetries + 1
      })...`
    );

    provider = new ethers.JsonRpcProvider(RPC_URL);

    // Test connection with a simple call
    const network = await provider.getNetwork();
    console.log(
      `🌐 Connected to network: ${network.name} (Chain ID: ${network.chainId})`
    );

    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    console.log("✅ Web3 initialized successfully");
    console.log(`📱 Connected to: ${RPC_URL}`);
    console.log(`👤 Wallet address: ${wallet.address}`);
    console.log(`📄 Contract address: ${CONTRACT_ADDRESS}`);

    // Verify contract ownership with timeout
    const owner = await Promise.race([
      contract.owner(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Contract call timeout")), 10000)
      ),
    ]);
    console.log(`🔑 Contract owner: ${owner}`);

    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.warn("⚠️  Warning: Wallet is not the contract owner");
    }

    return true;
  } catch (error) {
    console.error(
      `❌ Web3 initialization failed (attempt ${retryCount + 1}):`,
      error.message
    );

    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return initializeWeb3(retryCount + 1, maxRetries);
    }

    console.error(
      "💥 Max retries reached. Web3 initialization failed permanently."
    );
    console.log(
      "⚠️  Server will start in limited mode - Web3 features unavailable"
    );
    return false;
  }
};

// Batch processing function
const distributeRewardsInBatches = async () => {
  try {
    console.log("\n🚀 Starting reward distribution process...");

    // Validate Web3 connection before proceeding
    if (!provider || !contract || !wallet) {
      throw new Error(
        "Web3 not initialized. Cannot proceed with distribution."
      );
    }

    // Get total users count with timeout and retry
    let totalUsers;
    try {
      totalUsers = await Promise.race([
        contract.getUSersLengh(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Contract call timeout")), 15000)
        ),
      ]);
    } catch (contractError) {
      console.error("❌ Failed to get user count:", contractError.message);
      throw new Error(`Contract connection failed: ${contractError.message}`);
    }

    console.log(`📊 Total users in contract: ${totalUsers.toString()}`);

    if (totalUsers === 0n) {
      console.log("ℹ️  No users found, skipping distribution");
      return { success: true, message: "No users to process" };
    }

    // Calculate batches
    const totalBatches = Math.ceil(Number(totalUsers) / BATCH_SIZE);
    console.log(
      `📦 Processing ${totalUsers.toString()} users in ${totalBatches} batches of ${BATCH_SIZE}`
    );

    let successCount = 0;
    let failureCount = 0;
    const failedBatches = [];

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(
        startIndex + BATCH_SIZE - 1,
        Number(totalUsers) - 1
      );

      try {
        console.log(`\n📦 Processing Batch ${batchIndex + 1}/${totalBatches} (Users: ${startIndex}-${endIndex})`);

        // Gas Estimation
        let gasEstimate;
        try {
          gasEstimate = await Promise.race([
            contract.distributeRewardsToAll.estimateGas(startIndex, endIndex),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Gas estimation timeout")),
                10000
              )
            ),
          ]);
          console.log(`⛽ Gas estimated: ${gasEstimate.toString()}`);
        } catch (gasError) {
          console.error(`❌ Gas estimation failed:`, gasError.message);
          failedBatches.push({
            batch: batchIndex + 1,
            error: gasError.message,
          });
          failureCount++;
          continue;
        }

        // Transaction Submission
        const tx = await Promise.race([
          contract.distributeRewardsToAll(startIndex, endIndex, {
            gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Transaction submission timeout")),
              15000
            )
          ),
        ]);

        console.log(`🚀 Transaction submitted: ${tx.hash}`);

        // Transaction Confirmation
        const receipt = await Promise.race([
          tx.wait(),
          new Promise(
            (_, reject) =>
              setTimeout(
                () => reject(new Error("Transaction confirmation timeout")),
                300000
              ) // 5 minutes
          ),
        ]);

        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

        if (receipt.status === 1) {
          console.log(`🎉 Batch ${batchIndex + 1} completed successfully`);
          successCount++;
        } else {
          console.log(`❌ Batch ${batchIndex + 1} failed - Transaction reverted`);
          failedBatches.push({
            batch: batchIndex + 1,
            error: "Transaction failed",
          });
          failureCount++;
        }

        // Rate Limiting
        if (batchIndex < totalBatches - 1) {
          console.log(`⏸️  Waiting 5 seconds before next batch...`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.log(`❌ Batch ${batchIndex + 1} failed: ${error.message}`);
        failureCount++;
        failedBatches.push({ batch: batchIndex + 1, error: error.message });
        continue;
      }
    }

    const summary = {
      success: successCount > 0,
      totalBatches,
      successCount,
      failureCount,
      failedBatches,
      message: `${successCount}/${totalBatches} batches completed successfully`,
    };

    console.log(`\n📈 Distribution Summary:`);
    console.log(`   • Total Batches: ${totalBatches}`);
    console.log(`   • Successful: ${successCount}`);
    console.log(`   • Failed: ${failureCount}`);
    console.log(`   • Success Rate: ${totalBatches > 0 ? ((successCount / totalBatches) * 100).toFixed(2) : 0}%`);
    console.log(`   • Total Users: ${Number(totalUsers)}`);

    if (successCount === totalBatches) {
      console.log(`🎉 All batches completed successfully!`);
    } else if (successCount > 0) {
      console.log(`⚠️  Partial success: ${successCount}/${totalBatches} batches completed`);
    } else {
      console.log(`❌ All batches failed`);
    }

    return summary;
  } catch (error) {
    console.error("💥 Fatal error in reward distribution:", error.message);
    return {
      success: false,
      error: error.message,
      message: "Distribution process failed completely",
    };
  }
};

// Immediate distribution endpoint (for testing)
app.post("/distribute-now", async (req, res) => {
  try {
    console.log("🚀 Immediate distribution triggered via API");

    // Validate Web3 connection
    if (!provider || !contract || !wallet) {
      return res.status(503).json({
        success: false,
        error: "Web3 connection not available",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await distributeRewardsInBatches();

    if (result.success) {
      res.json({
        success: true,
        message: "Immediate reward distribution completed",
        details: result,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || "Distribution failed",
        details: result,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("❌ Immediate distribution failed:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Manual trigger endpoint
app.post("/trigger-distribution", async (req, res) => {
  try {
    console.log("🔧 Manual distribution triggered via API");

    // Validate Web3 connection
    if (!provider || !contract || !wallet) {
      return res.status(503).json({
        success: false,
        error: "Web3 connection not available",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await distributeRewardsInBatches();

    if (result.success) {
      res.json({
        success: true,
        message: result.message || "Reward distribution completed",
        details: result,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || "Distribution failed",
        details: result,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("❌ Manual distribution failed:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Check Web3 connection
    if (!provider || !contract || !wallet) {
      return res.status(503).json({
        status: "unhealthy",
        error: "Web3 connection not initialized",
        timestamp: new Date().toISOString(),
      });
    }

    // Test contract connection with timeout
    const totalUsers = await Promise.race([
      contract.getUSersLengh(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Contract call timeout")), 5000)
      ),
    ]);

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      contract: CONTRACT_ADDRESS,
      totalUsers: totalUsers.toString(),
      wallet: wallet.address,
      network: RPC_URL,
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
});

// Check user rewards endpoint
app.get("/user-rewards/:address", async (req, res) => {
  try {
    const userAddress = req.params.address;

    // Validate Web3 connection
    if (!provider || !contract || !wallet) {
      return res.status(503).json({
        error: "Web3 connection not available",
        timestamp: new Date().toISOString(),
      });
    }

    // Get user record
    const userRecord = await contract.userRecord(userAddress);

    if (!userRecord.isRegistered) {
      return res.status(404).json({
        error: "User not registered",
        timestamp: new Date().toISOString(),
      });
    }

    // Get claimable amounts for each stake
    const stakes = [];
    for (let i = 0; i < userRecord.stakeCount; i++) {
      const claimable = await contract.calculateClaimAbles(userAddress, i);
      stakes.push({
        stakeIndex: i,
        claimable: claimable.toString(),
        claimableFormatted: ethers.formatEther(claimable),
      });
    }

    res.json({
      userAddress,
      totalInvestment: userRecord.totalInvestment.toString(),
      totalWithdrawn: userRecord.totalWithdrawn.toString(),
      stakeCount: userRecord.stakeCount.toString(),
      stakes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ User rewards check failed:", error.message);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Contract info endpoint
app.get("/contract-info", async (req, res) => {
  try {
    // Validate Web3 connection
    if (!provider || !contract || !wallet) {
      return res.status(503).json({
        error: "Web3 connection not available",
        timestamp: new Date().toISOString(),
      });
    }

    // Get contract info with timeout
    const [owner, totalUsers] = await Promise.all([
      Promise.race([
        contract.owner(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Owner call timeout")), 5000)
        ),
      ]),
      Promise.race([
        contract.getUSersLengh(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("User count call timeout")), 5000)
        ),
      ]),
    ]);

    res.json({
      contractAddress: CONTRACT_ADDRESS,
      owner: owner,
      totalUsers: totalUsers.toString(),
      wallet: wallet.address,
      batchSize: BATCH_SIZE,
      cronSchedule: CRON_SCHEDULE,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Contract info failed:", error.message);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Setup cron job
const setupCronJob = () => {
  try {
    console.log(`⏰ Setting up cron job with schedule: ${CRON_SCHEDULE}`);

    cron.schedule(
      CRON_SCHEDULE,
      async () => {
        console.log(
          "\n🕐 Cron job triggered - Starting daily reward distribution..."
        );
        try {
          const result = await distributeRewardsInBatches();
          if (result.success) {
            console.log("✅ Reward distribution completed successfully");
          } else {
            console.log(
              "⚠️  Reward distribution completed with errors:",
              result.message
            );
          }
        } catch (error) {
          console.error("❌ Reward distribution failed:", error.message);
          // Don't throw the error - isolate cron failures from main server
        }
      },
      {
        scheduled: true,
       
      }
    );

    console.log("✅ Cron job scheduled successfully");
  } catch (error) {
    console.error("❌ Failed to setup cron job:", error.message);
    console.log("⚠️  Server will continue without scheduled distributions");
  }
};

// Express error handling middleware
app.use((error, req, res, next) => {
  console.error("❌ Unhandled Express error:", error.message);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler - catch all unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    timestamp: new Date().toISOString(),
  });
});

// Start server
const startServer = async () => {
  try {
    console.log("🚀 Starting server initialization...");

    // Initialize Web3
    const web3Initialized = await initializeWeb3();
    if (!web3Initialized) {
      console.log(
        "⚠️  Web3 initialization failed. Starting server in limited mode."
      );
      console.log("📝 Manual distribution endpoints will be unavailable");
      console.log("📝 Health check endpoint will still work");
    } else {
      console.log("✅ Web3 initialized successfully");
      // Setup cron job only if Web3 is working
      setupCronJob();
    }

    // Start Express server with retry logic
    let server;
    let portAttempts = 0;
    const maxPortAttempts = 5;
    let currentPort = PORT;

    while (portAttempts < maxPortAttempts) {
      try {
        server = app.listen(currentPort, () => {
          console.log("\n🚀 Server started successfully!");
          console.log(`🌐 Server running on port ${currentPort}`);
          console.log(
            `📊 Health check: http://localhost:${currentPort}/health`
          );
          console.log(
            `📄 Contract info: http://localhost:${currentPort}/contract-info`
          );
          console.log(
            `🔧 Manual trigger: POST http://localhost:${currentPort}/trigger-distribution`
          );
          console.log(
            `🚀 Immediate distribution: POST http://localhost:${currentPort}/distribute-now`
          );
          console.log(
            `👤 Check user rewards: GET http://localhost:${currentPort}/user-rewards/{address}`
          );
          console.log(`⏰ Cron schedule: ${CRON_SCHEDULE} (UTC)`);
          console.log("\n📝 Logs will appear below...\n");
        });

        // Handle server errors
        server.on("error", (error) => {
          if (error.code === "EADDRINUSE") {
            console.error(
              `❌ Port ${currentPort} is already in use. Trying next port...`
            );
            currentPort++;
            portAttempts++;
            if (portAttempts < maxPortAttempts) {
              setTimeout(() => startServer(), 1000);
            } else {
              console.error(
                "❌ Could not find an available port after multiple attempts"
              );
              process.exit(1);
            }
          } else {
            console.error("❌ Server error:", error.message);
            process.exit(1);
          }
        });

        return server;
      } catch (listenError) {
        console.error(
          `❌ Failed to start server on port ${currentPort}:`,
          listenError.message
        );
        currentPort++;
        portAttempts++;

        if (portAttempts >= maxPortAttempts) {
          throw new Error(
            `Could not start server on any port after ${maxPortAttempts} attempts`
          );
        }

        console.log(`⏳ Trying port ${currentPort}...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error("💥 Failed to start server:", error.message);
    console.log("🔄 Attempting graceful shutdown...");
    process.exit(1);
  }
};

// Global error handlers
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "❌ Unhandled Promise Rejection at:",
    promise,
    "reason:",
    reason
  );
  console.log("⚠️  Server will continue running despite this error");
  // Don't exit the process - log and continue
});

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error.message);
  console.error("Stack:", error.stack);
  console.log("⚠️  Attempting to continue server operation...");
  // Don't exit immediately - try to continue running
  // Only exit if it's a critical error
  if (error.message.includes("EADDRINUSE") || error.message.includes("port")) {
    console.log(
      "🔄 Port-related error detected. Attempting graceful shutdown..."
    );
    process.exit(1);
  }
  // For other errors, log and continue
});

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n👋 Received ${signal}. Shutting down server gracefully...`);

  // Close any active connections
  if (provider && provider.removeAllListeners) {
    provider.removeAllListeners();
  }

  console.log("✅ Server shutdown complete");
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Start the server
startServer().catch((error) => {
  console.error("💥 Failed to start server:", error.message);
  process.exit(1);
});
