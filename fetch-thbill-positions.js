/**
 * Pool Position Snapshots Fetcher
 * =================================
 * 
 * This script fetches and displays current position snapshots for a specific pool
 * from the Upheaval Finance DEX subgraph.
 * 
 * WHAT IT DOES:
 * -------------
 * 1. Fetches all current positions for the specified pool
 * 2. Gets position snapshots from the last 7 days
 * 3. Shows detailed position data including liquidity, deposits, withdrawals, and fees
 * 4. Groups and displays data by position and user
 * 5. Provides summary statistics
 * 
 * TARGET POOL:
 * ------------
 * - Pool ID: 0xc06e0fea115e54c54125dfe2f0509d5be55e4005
 * 
 * OUTPUT FORMAT:
 * --------------
 * The script prints organized data showing:
 * - Pool information (tokens, addresses)
 * - Current positions with their owners
 * - Position snapshots with detailed metrics
 * - Summary statistics
 * 
 * USAGE:
 * ------
 * Run directly: `node fetch-pool-positions.js`
 * 
 * @author Generated with Claude Code
 * @date 2025-09-11
 */

const POOL_ID = '0xc06e0fea115e54c54125dfe2f0509d5be55e4005';
const SUBGRAPH_URL = 'https://api.upheaval.fi/subgraphs/name/upheaval/exchange-v3';

// Get timestamp for 7 days ago
function getSevenDaysAgo() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return Math.floor(sevenDaysAgo.getTime() / 1000);
}

// GraphQL query to fetch pool information
const POOL_INFO_QUERY = `
  query GetPoolInfo($poolId: String!) {
    pool(id: $poolId) {
      id
      token0 {
        id
        name
        symbol
        decimals
      }
      token1 {
        id
        name
        symbol
        decimals
      }
      feeTier
      liquidity
      sqrtPrice
      tick
      observationIndex
      volumeUSD
      txCount
      totalValueLockedUSD
    }
  }
`;

// GraphQL query to fetch current positions for the pool
const CURRENT_POSITIONS_QUERY = `
  query GetCurrentPositions($poolId: String!) {
    positions(
      where: {
        pool: $poolId,
        liquidity_gt: "0"
      }
      orderBy: liquidity
      orderDirection: desc
      first: 1000
    ) {
      id
      owner
      liquidity
      depositedToken0
      depositedToken1
      withdrawnToken0
      withdrawnToken1
      collectedFeesToken0
      collectedFeesToken1
      tickLower {
        tickIdx
      }
      tickUpper {
        tickIdx
      }
      pool {
        id
        token0 {
          id
          name
          symbol
        }
        token1 {
          id
          name
          symbol
        }
      }
    }
  }
`;

// GraphQL query to fetch position snapshots for the pool
const POSITION_SNAPSHOTS_QUERY = `
  query GetPositionSnapshots($poolId: String!, $timestamp: BigInt!) {
    positionSnapshots(
      where: {
        pool: $poolId,
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
          symbol
        }
        token1 {
          id
          name
          symbol
        }
      }
      position {
        id
        tickLower {
          tickIdx
        }
        tickUpper {
          tickIdx
        }
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
    }
  }
`;

async function fetchPoolInfo() {
  try {
    console.log(`Fetching pool information for ${POOL_ID}...`);
    
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/graphql-response+json, application/json',
      },
      body: JSON.stringify({
        query: POOL_INFO_QUERY,
        variables: {
          poolId: POOL_ID
        }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error('GraphQL errors: ' + JSON.stringify(data.errors));
    }

    if (!data.data.pool) {
      throw new Error(`Pool ${POOL_ID} not found`);
    }

    return data.data.pool;

  } catch (error) {
    console.error('Error fetching pool info:', error);
    throw error;
  }
}

async function fetchCurrentPositions() {
  try {
    console.log(`Fetching current positions for pool ${POOL_ID}...`);
    
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/graphql-response+json, application/json',
      },
      body: JSON.stringify({
        query: CURRENT_POSITIONS_QUERY,
        variables: {
          poolId: POOL_ID
        }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error('GraphQL errors: ' + JSON.stringify(data.errors));
    }

    console.log(`Found ${data.data.positions.length} current positions with liquidity > 0`);
    return data.data.positions;

  } catch (error) {
    console.error('Error fetching current positions:', error);
    throw error;
  }
}

async function fetchPositionSnapshots() {
  try {
    const sevenDaysAgoTimestamp = getSevenDaysAgo();
    
    console.log(`Fetching position snapshots for pool ${POOL_ID}...`);
    console.log(`Time range: Last 7 days (since ${new Date(sevenDaysAgoTimestamp * 1000).toISOString()})`);
    
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/graphql-response+json, application/json',
      },
      body: JSON.stringify({
        query: POSITION_SNAPSHOTS_QUERY,
        variables: {
          poolId: POOL_ID,
          timestamp: sevenDaysAgoTimestamp.toString()
        }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
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
  const numAmount = parseFloat(amount);
  if (numAmount === 0) return '0';
  
  if (numAmount >= 1) {
    return numAmount.toFixed(6);
  } else {
    return numAmount.toFixed(12);
  }
}

function displayPoolInfo(pool) {
  console.log('\n=== POOL INFORMATION ===');
  console.log(`Pool ID: ${pool.id}`);
  console.log(`Token0: ${pool.token0.name} (${pool.token0.symbol}) - ${pool.token0.id}`);
  console.log(`Token1: ${pool.token1.name} (${pool.token1.symbol}) - ${pool.token1.id}`);
  console.log(`Fee Tier: ${pool.feeTier}`);
  console.log(`Current Liquidity: ${pool.liquidity}`);
  console.log(`Current Tick: ${pool.tick}`);
  console.log(`Total Value Locked USD: $${parseFloat(pool.totalValueLockedUSD || 0).toFixed(2)}`);
  console.log(`Volume USD: $${parseFloat(pool.volumeUSD || 0).toFixed(2)}`);
  console.log(`Transaction Count: ${pool.txCount}`);
}

function displayCurrentPositions(positions, pool) {
  console.log('\n=== CURRENT POSITIONS (Active Liquidity) ===');
  
  if (positions.length === 0) {
    console.log('No active positions found in this pool');
    return;
  }

  // Group positions by owner
  const positionsByOwner = {};
  positions.forEach(position => {
    const owner = position.owner;
    if (!positionsByOwner[owner]) {
      positionsByOwner[owner] = [];
    }
    positionsByOwner[owner].push(position);
  });

  Object.entries(positionsByOwner).forEach(([owner, userPositions]) => {
    console.log(`\n👤 Owner: ${owner} (${userPositions.length} positions)`);
    
    userPositions.forEach((position, index) => {
      console.log(`\n  📍 Position ${index + 1}:`);
      console.log(`     Position ID: ${position.id}`);
      console.log(`     Liquidity: ${position.liquidity}`);
      console.log(`     Tick Range: ${position.tickLower.tickIdx} to ${position.tickUpper.tickIdx}`);
      console.log(`     Deposited ${pool.token0.symbol}: ${formatTokenAmount(position.depositedToken0)}`);
      console.log(`     Deposited ${pool.token1.symbol}: ${formatTokenAmount(position.depositedToken1)}`);
      console.log(`     Withdrawn ${pool.token0.symbol}: ${formatTokenAmount(position.withdrawnToken0)}`);
      console.log(`     Withdrawn ${pool.token1.symbol}: ${formatTokenAmount(position.withdrawnToken1)}`);
      console.log(`     Collected Fees ${pool.token0.symbol}: ${formatTokenAmount(position.collectedFeesToken0)}`);
      console.log(`     Collected Fees ${pool.token1.symbol}: ${formatTokenAmount(position.collectedFeesToken1)}`);
    });
  });

  // Summary statistics
  const totalLiquidity = positions.reduce((sum, p) => sum + parseFloat(p.liquidity), 0);
  console.log(`\n📊 CURRENT POSITIONS SUMMARY:`);
  console.log(`   Total Active Positions: ${positions.length}`);
  console.log(`   Unique Owners: ${Object.keys(positionsByOwner).length}`);
  console.log(`   Total Liquidity: ${totalLiquidity.toFixed(0)}`);
  console.log(`   Average Liquidity per Position: ${(totalLiquidity / positions.length).toFixed(0)}`);
}

function displayPositionSnapshots(snapshots, pool) {
  console.log('\n=== POSITION SNAPSHOTS (Last 7 Days) ===');
  
  if (snapshots.length === 0) {
    console.log('No position snapshots found in the last 7 days');
    return;
  }

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

  // Sort positions by activity level
  const sortedPositions = Object.entries(snapshotsByPosition)
    .sort(([, a], [, b]) => b.length - a.length);

  sortedPositions.forEach(([positionId, positionSnapshots]) => {
    const firstSnapshot = positionSnapshots[0];
    const owner = firstSnapshot.owner;
    
    console.log(`\n🎯 Position ID: ${positionId}`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Snapshots: ${positionSnapshots.length}`);
    
    if (firstSnapshot.position?.tickLower && firstSnapshot.position?.tickUpper) {
      console.log(`   Tick Range: ${firstSnapshot.position.tickLower.tickIdx} to ${firstSnapshot.position.tickUpper.tickIdx}`);
    }

    // Show recent snapshots (max 3)
    const recentSnapshots = positionSnapshots.slice(0, 3);
    recentSnapshots.forEach((snapshot, index) => {
      const date = new Date(parseInt(snapshot.timestamp) * 1000);
      console.log(`\n   📸 Snapshot ${index + 1} - ${date.toISOString()}`);
      console.log(`      Block: ${snapshot.blockNumber}`);
      console.log(`      Liquidity: ${snapshot.liquidity}`);
      console.log(`      Deposited ${pool.token0.symbol}: ${formatTokenAmount(snapshot.depositedToken0)}`);
      console.log(`      Deposited ${pool.token1.symbol}: ${formatTokenAmount(snapshot.depositedToken1)}`);
      console.log(`      Withdrawn ${pool.token0.symbol}: ${formatTokenAmount(snapshot.withdrawnToken0)}`);
      console.log(`      Withdrawn ${pool.token1.symbol}: ${formatTokenAmount(snapshot.withdrawnToken1)}`);
      console.log(`      Fees ${pool.token0.symbol}: ${formatTokenAmount(snapshot.collectedFeesToken0)}`);
      console.log(`      Fees ${pool.token1.symbol}: ${formatTokenAmount(snapshot.collectedFeesToken1)}`);
    });

    if (positionSnapshots.length > 3) {
      console.log(`   ... and ${positionSnapshots.length - 3} more snapshots`);
    }
  });

  // Overall summary
  const uniqueOwners = new Set(snapshots.map(s => s.owner)).size;
  console.log(`\n📊 SNAPSHOTS SUMMARY:`);
  console.log(`   Total Snapshots: ${snapshots.length}`);
  console.log(`   Unique Positions: ${sortedPositions.length}`);
  console.log(`   Unique Owners: ${uniqueOwners}`);
  console.log(`   Most Active Position: ${sortedPositions[0]?.[0]} (${sortedPositions[0]?.[1].length} snapshots)`);
}

// Main execution
async function main() {
  try {
    console.log(`\n🔍 FETCHING DATA FOR POOL: ${POOL_ID}\n`);
    
    // Fetch all data
    const [poolInfo, currentPositions, positionSnapshots] = await Promise.all([
      fetchPoolInfo(),
      fetchCurrentPositions(),
      fetchPositionSnapshots()
    ]);
    
    // Display all information
    displayPoolInfo(poolInfo);
    displayCurrentPositions(currentPositions, poolInfo);
    displayPositionSnapshots(positionSnapshots, poolInfo);
    
    console.log('\n✅ Data fetch complete!\n');
    
    return {
      poolInfo,
      currentPositions,
      positionSnapshots
    };
    
  } catch (error) {
    console.error('Failed to fetch pool position data:', error);
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchPoolInfo,
    fetchCurrentPositions,
    fetchPositionSnapshots,
    displayPoolInfo,
    displayCurrentPositions,
    displayPositionSnapshots,
    POOL_ID,
    SUBGRAPH_URL,
    main
  };
}

// Run if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  main();
}