// demo.ts
import { Leader, Follower, LAG_MS } from './node';

async function runDemo() {
  const followerA = new Follower();
  const followerB = new Follower();
  const leader = new Leader([followerA, followerB]);

  console.log('=== STEP 1: INITIAL STATE ===');
  console.log(`Leader x:     ${leader.readFromLeader('x')}`); // undefined
  console.log(`Follower A x: ${followerA.read('x')}`);         // undefined
  console.log(`Follower B x: ${followerB.read('x')}`);         // undefined

  console.log('\n=== STEP 2: WRITING x = 1 TO LEADER ===');
  console.log('Executing write("x", 1)...');
  leader.write('x', 1);

  console.log('\n--- Immediate Read (t = 0ms) ---');
  console.log(`Leader x:     ${leader.readFromLeader('x')}`); // 1
  console.log(`Follower A x: ${followerA.read('x')}`);         // undefined (STALE!)
  console.log(`Follower B x: ${followerB.read('x')}`);         // undefined (STALE!)

  console.log(`\n=== STEP 3: WAITING FOR NETWORK IN-FLIGHT DELAY (${LAG_MS}ms) ===`);
  
  // Read halfway through the lag window (t = 50ms)
  await new Promise((resolve) => setTimeout(resolve, LAG_MS / 2));
  console.log('--- Mid-Flight Read (t = 50ms) ---');
  console.log(`Follower A x: ${followerA.read('x')}`);         // undefined (STALE!)

  // Read after network propagation finishes (t = 150ms)
  await new Promise((resolve) => setTimeout(resolve, LAG_MS));
  console.log('\n--- Post-Lag Read (t = 150ms) ---');
  console.log(`Leader x:     ${leader.readFromLeader('x')}`); // 1
  console.log(`Follower A x: ${followerA.read('x')}`);         // 1 (CONVERGED!)
  console.log(`Follower B x: ${followerB.read('x')}`);         // 1 (CONVERGED!)
}

runDemo();