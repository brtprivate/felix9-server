# SafeMint Server - Daily Reward Distribution

This server automatically distributes rewards to all users in the SafeMint contract using batch processing and daily cron jobs.

## Features

- 🚀 **Automated Daily Distribution**: Runs `distributeRewardsToAll` function daily via cron job
- 📦 **Batch Processing**: Processes users in batches of 100 (configurable) to avoid gas limits
- 🔧 **Manual Triggers**: API endpoints for manual distribution and monitoring
- 🛡️ **Error Handling**: Comprehensive error handling and logging
- 📊 **Health Monitoring**: Health check and contract info endpoints
- ⚡ **Gas Optimization**: Smart gas estimation with 20% buffer

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

1. Copy the example config file:
```bash
cp server/config.env.example server/config.env
```

2. Edit `server/config.env` with your settings:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Blockchain Configuration
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
CONTRACT_ADDRESS=0x8e90aa73cd1dda82dfb62807ef8bfc2112d90def

# Private Key (NEVER commit this to version control)
PRIVATE_KEY=your_private_key_here

# Cron Configuration
CRON_SCHEDULE=0 0 * * *
BATCH_SIZE=100

# Logging
LOG_LEVEL=info
```

**⚠️ Important**: 
- Replace `your_private_key_here` with your actual private key
- Make sure the wallet has enough BNB for gas fees
- The wallet must be the contract owner to execute `distributeRewardsToAll`

### 3. Start the Server

```bash
# Production mode
pnpm start

# Development mode with auto-reload
pnpm run server:dev
```

## API Endpoints

### Health Check
```
GET http://localhost:3001/health
```
Returns server and contract status.

### Contract Information
```
GET http://localhost:3001/contract-info
```
Returns contract details, user count, and configuration.

### Manual Distribution Trigger
```
POST http://localhost:3001/trigger-distribution
```
Manually triggers the reward distribution process.

## Cron Job Configuration

The server runs a daily cron job by default. You can customize the schedule in `config.env`:

- `0 0 * * *` - Daily at midnight UTC
- `0 2 * * *` - Daily at 2 AM UTC
- `0 0 */2 * *` - Every 2 days at midnight UTC

## Batch Processing

- **Batch Size**: 100 users per batch (configurable via `BATCH_SIZE`)
- **Gas Optimization**: Each batch estimates gas and adds 20% buffer
- **Rate Limiting**: 5-second delay between batches
- **Error Handling**: Failed batches are logged and skipped

## Monitoring & Logs

The server provides detailed logging:

```
✅ Web3 initialized successfully
📱 Connected to: https://data-seed-prebsc-1-s1.binance.org:8545/
👤 Wallet address: 0x...
📄 Contract address: 0x8e90aa73cd1dda82dfb62807ef8bfc2112d90def
🔑 Contract owner: 0x...

🚀 Starting reward distribution process...
📊 Total users in contract: 1500
📦 Processing 1500 users in 15 batches of 100

📦 Processing batch 1/15 (users 0-99)
⛽ Estimated gas: 2100000
⏳ Transaction submitted: 0x...
✅ Batch 1 completed successfully!
```

## Troubleshooting

### Common Issues

1. **Private Key Not Set**
   ```
   ❌ Private key not provided. Please set PRIVATE_KEY in config.env
   ```
   Solution: Add your private key to `server/config.env`

2. **Not Contract Owner**
   ```
   ⚠️ Warning: Wallet is not the contract owner
   ```
   Solution: Use the wallet that deployed the contract or transfer ownership

3. **Gas Estimation Failed**
   ```
   ❌ Error in batch X: execution reverted
   ```
   Solution: Check if there are users with claimable rewards in that batch

4. **Network Connection Issues**
   ```
   ❌ Web3 initialization failed: could not detect network
   ```
   Solution: Check RPC_URL in config.env

### Manual Testing

Test the distribution manually:
```bash
curl -X POST http://localhost:3001/trigger-distribution
```

Check server health:
```bash
curl http://localhost:3001/health
```

## Security Notes

- 🔐 Never commit private keys to version control
- 🛡️ Use environment variables for sensitive data
- 🔒 Run on secure servers with proper access controls
- 📝 Monitor logs for any suspicious activity

## Contract Integration

The server integrates with the SafeMint contract at:
- **Address**: `0x8e90aa73cd1dda82dfb62807ef8bfc2112d90def`
- **Network**: BSC Testnet
- **Function**: `distributeRewardsToAll(uint256 startIndex, uint256 endIndex)`

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify your configuration in `config.env`
3. Test the contract connection via health endpoint
4. Ensure sufficient BNB balance for gas fees
