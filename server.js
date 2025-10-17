import express from 'express';
import cron from 'node-cron';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const loadEnvConfig = () => {
  const envPath = path.join(__dirname, 'config.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });
    return envVars;
  }
  return {};
};

const config = loadEnvConfig();

// Configuration
const PORT = config.PORT || 3001;
const RPC_URL = config.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const CONTRACT_ADDRESS = config.CONTRACT_ADDRESS || '0x8e90aa73cd1dda82dfb62807ef8bfc2112d90def';
const PRIVATE_KEY = config.PRIVATE_KEY || process.env.PRIVATE_KEY;
const CRON_SCHEDULE = config.CRON_SCHEDULE || '0 0 * * *'; // Daily at midnight
const BATCH_SIZE = parseInt(config.BATCH_SIZE) || 100;

// Contract ABI (from contract.js)
const ABI = [
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
    name: "getUSersLengh",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

// Web3 Setup
let provider, wallet, contract;

const initializeWeb3 = async () => {
  try {
    if (!PRIVATE_KEY) {
      throw new Error('Private key not provided. Please set PRIVATE_KEY in config.env');
    }

    provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    console.log('✅ Web3 initialized successfully');
    console.log(`📱 Connected to: ${RPC_URL}`);
    console.log(`👤 Wallet address: ${wallet.address}`);
    console.log(`📄 Contract address: ${CONTRACT_ADDRESS}`);

    // Verify contract ownership
    const owner = await contract.owner();
    console.log(`🔑 Contract owner: ${owner}`);
    
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.warn('⚠️  Warning: Wallet is not the contract owner');
    }

    return true;
  } catch (error) {
    console.error('❌ Web3 initialization failed:', error.message);
    return false;
  }
};

// Batch processing function
const distributeRewardsInBatches = async () => {
  try {
    console.log('\n🚀 Starting reward distribution process...');
    
    // Get total users count
    const totalUsers = await contract.getUSersLengh();
    console.log(`📊 Total users in contract: ${totalUsers.toString()}`);

    if (totalUsers.eq(0)) {
      console.log('ℹ️  No users found, skipping distribution');
      return;
    }

    // Calculate batches
    const totalBatches = Math.ceil(totalUsers.toNumber() / BATCH_SIZE);
    console.log(`📦 Processing ${totalUsers.toString()} users in ${totalBatches} batches of ${BATCH_SIZE}`);

    let successCount = 0;
    let failureCount = 0;

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE - 1, totalUsers.toNumber() - 1);

      try {
        console.log(`\n📦 Processing batch ${batchIndex + 1}/${totalBatches} (users ${startIndex}-${endIndex})`);
        
        // Estimate gas first
        const gasEstimate = await contract.estimateGas.distributeRewardsToAll(startIndex, endIndex);
        console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);

        // Execute the transaction
        const tx = await contract.distributeRewardsToAll(startIndex, endIndex, {
          gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
        });

        console.log(`⏳ Transaction submitted: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);

        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log(`✅ Batch ${batchIndex + 1} completed successfully!`);
          console.log(`💰 Gas used: ${receipt.gasUsed.toString()}`);
          successCount++;
        } else {
          console.log(`❌ Batch ${batchIndex + 1} failed`);
          failureCount++;
        }

        // Add delay between batches to avoid rate limiting
        if (batchIndex < totalBatches - 1) {
          console.log('⏸️  Waiting 5 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

      } catch (error) {
        console.error(`❌ Error in batch ${batchIndex + 1}:`, error.message);
        failureCount++;
        
        // If it's a gas estimation error, skip this batch
        if (error.message.includes('gas') || error.message.includes('execution reverted')) {
          console.log('⏭️  Skipping this batch due to gas/execution error');
          continue;
        }
      }
    }

    console.log('\n📈 Distribution Summary:');
    console.log(`✅ Successful batches: ${successCount}`);
    console.log(`❌ Failed batches: ${failureCount}`);
    console.log(`📊 Total processed: ${successCount + failureCount}/${totalBatches}`);

  } catch (error) {
    console.error('💥 Fatal error in reward distribution:', error);
    throw error;
  }
};

// Manual trigger endpoint
app.post('/trigger-distribution', async (req, res) => {
  try {
    console.log('🔧 Manual distribution triggered via API');
    await distributeRewardsInBatches();
    res.json({ 
      success: true, 
      message: 'Reward distribution completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Manual distribution failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const totalUsers = await contract.getUSersLengh();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      contract: CONTRACT_ADDRESS,
      totalUsers: totalUsers.toString(),
      wallet: wallet.address,
      network: RPC_URL
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Contract info endpoint
app.get('/contract-info', async (req, res) => {
  try {
    const [owner, totalUsers] = await Promise.all([
      contract.owner(),
      contract.getUSersLengh()
    ]);

    res.json({
      contractAddress: CONTRACT_ADDRESS,
      owner: owner,
      totalUsers: totalUsers.toString(),
      wallet: wallet.address,
      batchSize: BATCH_SIZE,
      cronSchedule: CRON_SCHEDULE
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Setup cron job
const setupCronJob = () => {
  console.log(`⏰ Setting up cron job with schedule: ${CRON_SCHEDULE}`);
  
  cron.schedule(CRON_SCHEDULE, async () => {
    console.log('\n🕐 Cron job triggered - Starting daily reward distribution...');
    try {
      await distributeRewardsInBatches();
      console.log('✅ Daily reward distribution completed successfully');
    } catch (error) {
      console.error('❌ Daily reward distribution failed:', error);
    }
  }, {
    scheduled: true,
   
  });

  console.log('✅ Cron job scheduled successfully');
};

// Start server
const startServer = async () => {
  try {
    // Initialize Web3
    const web3Initialized = await initializeWeb3();
    if (!web3Initialized) {
      console.error('❌ Failed to initialize Web3. Server will not start.');
      process.exit(1);
    }

    // Setup cron job
    setupCronJob();

    // Start Express server
    app.listen(PORT, () => {
      console.log('\n🚀 Server started successfully!');
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📄 Contract info: http://localhost:${PORT}/contract-info`);
      console.log(`🔧 Manual trigger: POST http://localhost:${PORT}/trigger-distribution`);
      console.log(`⏰ Cron schedule: ${CRON_SCHEDULE} (UTC)`);
      console.log('\n📝 Logs will appear below...\n');
    });

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down server gracefully...');
  process.exit(0);
});

// Start the server
startServer();
