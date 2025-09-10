/**
 * K-HYPE Position Snapshots Fetcher
 * ==================================
 * 
 * This script fetches and displays position snapshots for all pools containing 
 * K-HYPE (Kinetiq Staked HYPE) token from the Upheaval Finance DEX subgraph.
 * 
 * WHAT IT DOES:
 * -------------
 * 1. Dynamically discovers all pools containing K-HYPE token
 * 2. Fetches position snapshots from the last 7 days for these pools
 * 3. Groups and displays detailed position data by pool and user
 * 4. Shows liquidity changes, token deposits, withdrawals, and fee collections
 * 
 * K-HYPE TOKEN:
 * ------------
 * - Token ID: 0xfd739d4e423301ce9385c1fb8850539d657c296d
 * - Name: Kinetiq Staked HYPE
 * - This is a liquid staking token for HYPE on HyperEVM
 * 
 * OUTPUT FORMAT:
 * --------------
 * The script prints organized data in the following structure:
 * 
 * 🏊 Pool: [Token0Name]/[Token1Name] ([Pool ID])
 *    Token0: [Name] ([Address])
 *    Token1: [Name] ([Address]) 
 *    Snapshots: [Count]
 * 
 *   👤 User: [User Address] ([Snapshot Count] snapshots)
 * 
 *     📸 Snapshot [N] - [ISO Timestamp]
 *        Position ID: [Position ID]
 *        Block: [Block Number]
 *        Liquidity: [Current Liquidity Amount]
 *        Deposited Token0: [Amount] [Token Name]
 *        Deposited Token1: [Amount] [Token Name]
 *        Withdrawn Token0: [Amount] [Token Name]
 *        Withdrawn Token1: [Amount] [Token Name]
 *        Collected Fees Token0: [Amount] [Token Name]
 *        Collected Fees Token1: [Amount] [Token Name]
 * 
 * SUMMARY STATISTICS:
 * ------------------
 * - Total Snapshots: [Count]
 * - Unique Users: [Count]
 * - Unique Positions: [Count]
 * - Pools Covered: [Count]
 * 
 * USAGE:
 * ------
 * Run directly: `node fetch-khype-positions.js`
 * Or import as module and use exported functions
 * 
 * TECHNICAL DETAILS:
 * -----------------
 * - Queries Upheaval Finance subgraph GraphQL endpoint
 * - Filters for last 7 days using timestamp >= (current_time - 7 days)
 * - Returns up to 1000 position snapshots ordered by timestamp (descending)
 * - All token amounts are formatted in human-readable decimal format
 * - Positions are grouped by pool and user for organized display
 * 
 * @author Generated with Claude Code
 * @date 2025-09-10
 */

const KHYPE_TOKEN_ID = '0xfd739d4e423301ce9385c1fb8850539d657c296d';
const SUBGRAPH_URL = 'https://api.upheaval.fi/subgraphs/name/upheaval/exchange-v3';

// GraphQL query to fetch all pools and filter for K-HYPE
const ALL_POOLS_QUERY = `
  query GetAllPools {
    pools {
      id
      token0 {
        id
        name
      }
      token1 {
        id
        name
      }
    }
  }
`;

// Function to fetch K-HYPE pools dynamically
async function fetchKHypePools() {
  try {
    console.log('Fetching K-HYPE pools...');
    
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/graphql-response+json, application/json',
      },
      body: JSON.stringify({
        query: ALL_POOLS_QUERY
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error('GraphQL errors: ' + JSON.stringify(data.errors));
    }

    // Filter pools client-side for K-HYPE token
    const allPools = data.data.pools;
    const kHypePools = allPools.filter(pool => 
      pool.token0.id.toLowerCase() === KHYPE_TOKEN_ID.toLowerCase() ||
      pool.token1.id.toLowerCase() === KHYPE_TOKEN_ID.toLowerCase()
    );
    
    console.log(`Found ${kHypePools.length} pools with K-HYPE out of ${allPools.length} total pools`);
    return kHypePools;

  } catch (error) {
    console.error('Error fetching K-HYPE pools:', error);
    throw error;
  }
}

// Get timestamp for 7 days ago
function getSevenDaysAgo() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return Math.floor(sevenDaysAgo.getTime() / 1000);
}

// GraphQL query to fetch position snapshots for specific pools in last 7 days
const POSITION_SNAPSHOTS_QUERY = `
  query GetPositionSnapshots($poolIds: [String!]!, $timestamp: BigInt!) {
    positionSnapshots(
      where: {
        pool_in: $poolIds,
        timestamp_gte: $timestamp
      }
      orderBy: timestamp
      orderDirection: desc
      first: 1000
    ) {
      id
      owner
      pool {
        id
        token0 {
          id
          name
        }
        token1 {
          id
          name
        }
      }
      position {
        id
      }
      blockNumber
      timestamp
      liquidity
      depositedToken0
      depositedToken1
      withdrawnToken0
      withdrawnToken1
      collectedFeesToken0
      collectedFeesToken1
      transaction {
        id
      }
      feeGrowthInside0LastX128
      feeGrowthInside1LastX128
    }
  }
`;

async function fetchKHypePositionSnapshots() {
  try {
    // First fetch K-HYPE pools dynamically
    const kHypePools = await fetchKHypePools();
    const kHypePoolIds = kHypePools.map(pool => pool.id);
    
    const sevenDaysAgoTimestamp = getSevenDaysAgo();
    
    console.log('Fetching position snapshots for K-HYPE pools...');
    console.log(`Time range: Last 7 days (since ${new Date(sevenDaysAgoTimestamp * 1000).toISOString()})`);
    console.log(`Pool IDs: ${kHypePoolIds.length} pools`);
    
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/graphql-response+json, application/json',
      },
      body: JSON.stringify({
        query: POSITION_SNAPSHOTS_QUERY,
        variables: {
          poolIds: kHypePoolIds,
          timestamp: sevenDaysAgoTimestamp.toString()
        }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error('GraphQL errors: ' + JSON.stringify(data.errors));
    }

    console.log(`Found ${data.data.positionSnapshots.length} position snapshots`);
    return data.data.positionSnapshots;

  } catch (error) {
    console.error('Error fetching position snapshots:', error);
    throw error;
  }
}

function formatTokenAmount(amount) {
  if (!amount || amount === '0') return '0';
  // The amount is already in decimal format from the subgraph
  const numAmount = parseFloat(amount);
  if (numAmount === 0) return '0';
  
  // Format to show appropriate decimal places
  if (numAmount >= 1) {
    return numAmount.toFixed(6);
  } else {
    return numAmount.toFixed(12);
  }
}

function displayPositionSnapshots(snapshots) {
  console.log('\n=== K-HYPE POSITION SNAPSHOTS (Last 7 Days) ===');
  
  if (snapshots.length === 0) {
    console.log('No position snapshots found for K-HYPE pools in the last 7 days');
    return;
  }

  // Group snapshots by pool for better organization
  const snapshotsByPool = {};
  snapshots.forEach(snapshot => {
    const poolId = snapshot.pool.id;
    if (!snapshotsByPool[poolId]) {
      snapshotsByPool[poolId] = [];
    }
    snapshotsByPool[poolId].push(snapshot);
  });

  Object.entries(snapshotsByPool).forEach(([poolId, poolSnapshots]) => {
    const pool = poolSnapshots[0].pool;
    console.log(`\n🏊 Pool: ${pool.token0.name}/${pool.token1.name} (${poolId})`);
    console.log(`   Token0: ${pool.token0.name} (${pool.token0.id})`);
    console.log(`   Token1: ${pool.token1.name} (${pool.token1.id})`);
    console.log(`   Snapshots: ${poolSnapshots.length}`);
    
    // Group by user for this pool
    const snapshotsByUser = {};
    poolSnapshots.forEach(snapshot => {
      const owner = snapshot.owner;
      if (!snapshotsByUser[owner]) {
        snapshotsByUser[owner] = [];
      }
      snapshotsByUser[owner].push(snapshot);
    });

    Object.entries(snapshotsByUser).forEach(([owner, userSnapshots]) => {
      console.log(`\n  👤 User: ${owner} (${userSnapshots.length} snapshots)`);
      
      userSnapshots.forEach((snapshot, index) => {
        const date = new Date(parseInt(snapshot.timestamp) * 1000);
        console.log(`\n    📸 Snapshot ${index + 1} - ${date.toISOString()}`);
        console.log(`       Position ID: ${snapshot.position?.id || 'N/A'}`);
        console.log(`       Block: ${snapshot.blockNumber}`);
        console.log(`       Liquidity: ${snapshot.liquidity}`);
        console.log(`       Deposited Token0: ${formatTokenAmount(snapshot.depositedToken0)} ${pool.token0.name}`);
        console.log(`       Deposited Token1: ${formatTokenAmount(snapshot.depositedToken1)} ${pool.token1.name}`);
        console.log(`       Withdrawn Token0: ${formatTokenAmount(snapshot.withdrawnToken0)} ${pool.token0.name}`);
        console.log(`       Withdrawn Token1: ${formatTokenAmount(snapshot.withdrawnToken1)} ${pool.token1.name}`);
        console.log(`       Collected Fees Token0: ${formatTokenAmount(snapshot.collectedFeesToken0)} ${pool.token0.name}`);
        console.log(`       Collected Fees Token1: ${formatTokenAmount(snapshot.collectedFeesToken1)} ${pool.token1.name}`);
        
        if (snapshot.position?.id) {
          console.log(`       Position ID: ${snapshot.position.id}`);
        }
      });
    });
  });

  // Summary statistics
  const totalUsers = new Set(snapshots.map(s => s.owner)).size;
  const totalPositions = new Set(snapshots.map(s => s.position?.id).filter(Boolean)).size;
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Snapshots: ${snapshots.length}`);
  console.log(`   Unique Users: ${totalUsers}`);
  console.log(`   Unique Positions: ${totalPositions}`);
  console.log(`   Pools Covered: ${Object.keys(snapshotsByPool).length}`);
}

// Main execution
async function main() {
  try {
    const snapshots = await fetchKHypePositionSnapshots();
    displayPositionSnapshots(snapshots);
    
    // Return snapshots for further processing if needed
    return snapshots;
  } catch (error) {
    console.error('Failed to fetch K-HYPE position snapshots:', error);
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchKHypePools,
    fetchKHypePositionSnapshots,
    displayPositionSnapshots,
    KHYPE_TOKEN_ID,
    SUBGRAPH_URL
  };
}

// Run if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  main();
}
