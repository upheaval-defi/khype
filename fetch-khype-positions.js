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
 * 3. Filters data for specific high-activity users (configurable)
 * 4. Groups and displays detailed position data by pool and user
 * 5. Shows liquidity changes, token deposits, withdrawals, and fee collections
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
 * POSITION-BASED GROUPING:
 * ------------------------
 * After the main output, displays transactions grouped by Position ID:
 * 
 * 🎯 Position ID: [Position ID]
 *    Owner: [User Address]
 *    Pool: [Token0Name]/[Token1Name] ([Pool ID])
 *    Activity: [Number] snapshots
 *    Current Liquidity: [Amount]
 *    Peak Liquidity: [Max Amount]
 * 
 *    📈 TOTALS ACROSS ALL ACTIVITY:
 *       Total Deposited Token0: [Amount] [Token Name]
 *       Total Deposited Token1: [Amount] [Token Name]
 *       Total Withdrawn Token0: [Amount] [Token Name]
 *       Total Withdrawn Token1: [Amount] [Token Name]
 *       Total Fees Token0: [Amount] [Token Name]
 *       Total Fees Token1: [Amount] [Token Name]
 * 
 *    💰 NET POSITION:
 *       Net Token0: [Deposits - Withdrawals] [Token Name]
 *       Net Token1: [Deposits - Withdrawals] [Token Name]
 * 
 *    📅 ACTIVITY TIMELINE ([Count] significant events):
 *       1. [Timestamp] (Block [Number])
 *          💵 Deposited: [Amounts]
 *          💸 Withdrawn: [Amounts]  
 *          💰 Fees: [Amounts]
 * 
 * USAGE:
 * ------
 * Run directly: `node fetch-khype-positions.js`
 * Or import as module and use exported functions
 * 
 * USER FILTERING:
 * ---------------
 * By default, filters data for specific high-activity users:
 * - 0x06253f963c242f3ac57201ff8298d7e5df3e8c4c
 * - 0x43395c11f8f81db0cee08dedd2d45c377a955387
 * 
 * To modify the filter, update the FILTER_USERS array.
 * To show all users, set FILTER_USERS to an empty array [].
 * 
 * TECHNICAL DETAILS:
 * -----------------
 * - Queries Upheaval Finance subgraph GraphQL endpoint
 * - Filters for last 7 days using timestamp >= (current_time - 7 days)
 * - Returns up to 1000 position snapshots ordered by timestamp (descending)
 * - Client-side filtering by user addresses for focused analysis
 * - All token amounts are formatted in human-readable decimal format
 * - Positions are grouped by pool and user for organized display
 * 
 * @author Generated with Claude Code
 * @date 2025-09-10
 */

const KHYPE_TOKEN_ID = '0xfd739d4e423301ce9385c1fb8850539d657c296d';
const SUBGRAPH_URL = 'https://api.upheaval.fi/subgraphs/name/upheaval/exchange-v3-fixed'';

// Filter for specific users with high activity
const FILTER_USERS = [
  '0x06253f963c242f3ac57201ff8298d7e5df3e8c4c',
  '0x43395c11f8f81db0cee08dedd2d45c377a955387'
];

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
  // Filter snapshots for specific users
  const filteredSnapshots = snapshots.filter(snapshot => 
    FILTER_USERS.includes(snapshot.owner.toLowerCase())
  );

  console.log('\n=== K-HYPE POSITION SNAPSHOTS (Last 7 Days) ===');
  console.log(`Filtering for specific users: ${FILTER_USERS.join(', ')}`);
  console.log(`Filtered to ${filteredSnapshots.length} snapshots from ${snapshots.length} total\n`);
  
  if (filteredSnapshots.length === 0) {
    console.log('No position snapshots found for the filtered users in K-HYPE pools');
    return;
  }

  // Group filtered snapshots by pool for better organization
  const snapshotsByPool = {};
  filteredSnapshots.forEach(snapshot => {
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

  // Summary statistics for filtered data
  const totalUsers = new Set(filteredSnapshots.map(s => s.owner)).size;
  const totalPositions = new Set(filteredSnapshots.map(s => s.position?.id).filter(Boolean)).size;
  
  console.log(`\n📊 SUMMARY (Filtered):`);
  console.log(`   Total Snapshots: ${filteredSnapshots.length}`);
  console.log(`   Unique Users: ${totalUsers}`);
  console.log(`   Unique Positions: ${totalPositions}`);
  console.log(`   Pools Covered: ${Object.keys(snapshotsByPool).length}`);
  
  // Position-based grouping for filtered data
  displayPositionTransactions(filteredSnapshots);
}

function displayPositionTransactions(snapshots) {
  console.log(`\n\n🏷️  === TRANSACTIONS BY POSITION ID ===`);
  
  // Group snapshots by position ID
  const snapshotsByPosition = {};
  snapshots.forEach(snapshot => {
    const positionId = snapshot.position?.id;
    if (positionId) {
      if (!snapshotsByPosition[positionId]) {
        snapshotsByPosition[positionId] = [];
      }
      snapshotsByPosition[positionId].push(snapshot);
    }
  });

  if (Object.keys(snapshotsByPosition).length === 0) {
    console.log('No positions found with valid position IDs');
    return;
  }

  // Sort positions by total activity (number of snapshots)
  const sortedPositions = Object.entries(snapshotsByPosition)
    .sort(([, a], [, b]) => b.length - a.length);

  sortedPositions.forEach(([positionId, positionSnapshots]) => {
    const firstSnapshot = positionSnapshots[0];
    const pool = firstSnapshot.pool;
    const owner = firstSnapshot.owner;
    
    // Calculate totals across all snapshots for this position
    let totalDeposited0 = 0;
    let totalDeposited1 = 0;
    let totalWithdrawn0 = 0;
    let totalWithdrawn1 = 0;
    let totalFees0 = 0;
    let totalFees1 = 0;
    let maxLiquidity = 0;
    let currentLiquidity = 0;
    
    positionSnapshots.forEach(snapshot => {
      totalDeposited0 += parseFloat(snapshot.depositedToken0 || 0);
      totalDeposited1 += parseFloat(snapshot.depositedToken1 || 0);
      totalWithdrawn0 += parseFloat(snapshot.withdrawnToken0 || 0);
      totalWithdrawn1 += parseFloat(snapshot.withdrawnToken1 || 0);
      totalFees0 += parseFloat(snapshot.collectedFeesToken0 || 0);
      totalFees1 += parseFloat(snapshot.collectedFeesToken1 || 0);
      
      const liquidity = parseFloat(snapshot.liquidity || 0);
      if (liquidity > maxLiquidity) {
        maxLiquidity = liquidity;
      }
      
      // Most recent snapshot (they're sorted by timestamp desc)
      if (snapshot === positionSnapshots[0]) {
        currentLiquidity = liquidity;
      }
    });

    console.log(`\n🎯 Position ID: ${positionId}`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Pool: ${pool.token0.name}/${pool.token1.name} (${pool.id})`);
    console.log(`   Activity: ${positionSnapshots.length} snapshots`);
    console.log(`   Current Liquidity: ${currentLiquidity}`);
    console.log(`   Peak Liquidity: ${maxLiquidity}`);
    
    console.log(`\n   📈 TOTALS ACROSS ALL ACTIVITY:`);
    console.log(`      Total Deposited Token0: ${formatTokenAmount(totalDeposited0.toString())} ${pool.token0.name}`);
    console.log(`      Total Deposited Token1: ${formatTokenAmount(totalDeposited1.toString())} ${pool.token1.name}`);
    console.log(`      Total Withdrawn Token0: ${formatTokenAmount(totalWithdrawn0.toString())} ${pool.token0.name}`);
    console.log(`      Total Withdrawn Token1: ${formatTokenAmount(totalWithdrawn1.toString())} ${pool.token1.name}`);
    console.log(`      Total Fees Token0: ${formatTokenAmount(totalFees0.toString())} ${pool.token0.name}`);
    console.log(`      Total Fees Token1: ${formatTokenAmount(totalFees1.toString())} ${pool.token1.name}`);
    
    // Net position (deposits - withdrawals)
    const netToken0 = totalDeposited0 - totalWithdrawn0;
    const netToken1 = totalDeposited1 - totalWithdrawn1;
    console.log(`\n   💰 NET POSITION:`);
    console.log(`      Net Token0: ${formatTokenAmount(netToken0.toString())} ${pool.token0.name}`);
    console.log(`      Net Token1: ${formatTokenAmount(netToken1.toString())} ${pool.token1.name}`);
    
    // Show timeline of major changes (only snapshots with significant activity)
    const significantSnapshots = positionSnapshots.filter(snapshot => {
      const hasDeposits = parseFloat(snapshot.depositedToken0 || 0) > 0 || parseFloat(snapshot.depositedToken1 || 0) > 0;
      const hasWithdrawals = parseFloat(snapshot.withdrawnToken0 || 0) > 0 || parseFloat(snapshot.withdrawnToken1 || 0) > 0;
      const hasFees = parseFloat(snapshot.collectedFeesToken0 || 0) > 0 || parseFloat(snapshot.collectedFeesToken1 || 0) > 0;
      return hasDeposits || hasWithdrawals || hasFees;
    });
    
    if (significantSnapshots.length > 0) {
      console.log(`\n   📅 ACTIVITY TIMELINE (${significantSnapshots.length} significant events):`);
      significantSnapshots.slice(0, 5).forEach((snapshot, index) => { // Show max 5 events
        const date = new Date(parseInt(snapshot.timestamp) * 1000);
        console.log(`      ${index + 1}. ${date.toISOString()} (Block ${snapshot.blockNumber})`);
        
        if (parseFloat(snapshot.depositedToken0 || 0) > 0 || parseFloat(snapshot.depositedToken1 || 0) > 0) {
          console.log(`         💵 Deposited: ${formatTokenAmount(snapshot.depositedToken0)} ${pool.token0.name}, ${formatTokenAmount(snapshot.depositedToken1)} ${pool.token1.name}`);
        }
        if (parseFloat(snapshot.withdrawnToken0 || 0) > 0 || parseFloat(snapshot.withdrawnToken1 || 0) > 0) {
          console.log(`         💸 Withdrawn: ${formatTokenAmount(snapshot.withdrawnToken0)} ${pool.token0.name}, ${formatTokenAmount(snapshot.withdrawnToken1)} ${pool.token1.name}`);
        }
        if (parseFloat(snapshot.collectedFeesToken0 || 0) > 0 || parseFloat(snapshot.collectedFeesToken1 || 0) > 0) {
          console.log(`         💰 Fees: ${formatTokenAmount(snapshot.collectedFeesToken0)} ${pool.token0.name}, ${formatTokenAmount(snapshot.collectedFeesToken1)} ${pool.token1.name}`);
        }
      });
      
      if (significantSnapshots.length > 5) {
        console.log(`      ... and ${significantSnapshots.length - 5} more events`);
      }
    }
  });

  console.log(`\n📊 POSITION SUMMARY:`);
  console.log(`   Total Unique Positions: ${sortedPositions.length}`);
  console.log(`   Most Active Position: ${sortedPositions[0][0]} (${sortedPositions[0][1].length} snapshots)`);
  console.log(`   Average Activity per Position: ${(snapshots.filter(s => s.position?.id).length / sortedPositions.length).toFixed(1)} snapshots`);
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