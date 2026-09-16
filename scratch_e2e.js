import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import config from './src/config/config.js';
import User from './src/models/user.model.js';
import Session from './src/models/session.model.js';
import Event from './src/models/event.model.js';
import Team from './src/models/team.model.js';
import TeamMembership from './src/models/teamMembership.model.js';
import EventEvaluator from './src/models/eventEvaluator.model.js';

async function generateTokenForUser(email, role, username) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      username,
      email,
      password: 'password123',
      role,
      verified: true,
      isActive: true
    });
  }

  const session = await Session.create({
    user: user._id,
    refreshTokenHash: 'testhash',
    ip: '127.0.0.1',
    userAgent: 'test'
  });

  return {
    user,
    token: jwt.sign({ id: user._id, sessionId: session._id }, config.JWT_SECRET, { expiresIn: '1h' })
  };
}

async function runE2ETests() {
  await mongoose.connect(config.MONGO_URI);
  console.log('Connected to DB');

  try {
    // 1. Setup Users
    const adminAuth = await generateTokenForUser('admin.e2e@example.com', 'ADMIN', 'admine2e');
    const studentAuth = await generateTokenForUser('student.e2e@example.com', 'STUDENT', 'studente2e');
    const evaluatorAuth = await generateTokenForUser('evaluator.e2e@example.com', 'EVALUATOR', 'evaluatore2e');

    // 2. Setup Context Data
    const event = await Event.create({
      name: 'Ecolympics E2E ' + Date.now(),
      description: 'E2E Testing Event',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      status: 'ACTIVE'
    });

    const team = await Team.create({
      name: 'Team Alpha E2E',
      eventId: event._id,
      captainId: studentAuth.user._id,
      status: 'ACTIVE'
    });

    await TeamMembership.create({
      teamId: team._id,
      userId: studentAuth.user._id,
      eventId: event._id,
      role: 'CAPTAIN'
    });

    await EventEvaluator.create({
      eventId: event._id,
      evaluatorId: evaluatorAuth.user._id,
      isActive: true
    });

    // --- Tests ---
    
    // Step 4: Test MERN -> Python -> MCP -> Groq
    console.log('\n--- Step 4: Test MERN -> Python -> MCP -> Groq ---');
    let res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentAuth.token}` },
      body: JSON.stringify({ message: "What is Ecolympics?", history: [] })
    });
    let data = await res.json();
    console.log(data);

    // Step 5: Test dynamic MongoDB context (STUDENT)
    console.log('\n--- Step 5: Test dynamic MongoDB context (STUDENT) ---');
    res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentAuth.token}` },
      body: JSON.stringify({ message: "What is the name of my team?", history: [] })
    });
    data = await res.json();
    console.log(data);

    // Step 6: Test evaluator isolation (EVALUATOR)
    console.log('\n--- Step 6: Test evaluator isolation (EVALUATOR) ---');
    res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${evaluatorAuth.token}` },
      body: JSON.stringify({ message: "What events am I assigned to evaluate?", history: [] })
    });
    data = await res.json();
    console.log(data);

    // Step 7: Test admin context (ADMIN)
    console.log('\n--- Step 7: Test admin context (ADMIN) ---');
    res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminAuth.token}` },
      body: JSON.stringify({ message: "How many total teams exist in the system?", history: [] })
    });
    data = await res.json();
    console.log(data);

    // Step 8: Test conversation history
    console.log('\n--- Step 8: Test conversation history ---');
    res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentAuth.token}` },
      body: JSON.stringify({ 
        message: "What is the name of my team?", 
        history: [
          { role: "user", content: "Tell me a joke." },
          { role: "assistant", content: "Why did the chicken cross the road? To get to Team Beta!" }
        ] 
      })
    });
    data = await res.json();
    console.log(data);

    // Step 9: Security boundaries
    console.log('\n--- Step 9: Security boundaries (Unauthenticated) ---');
    res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Hello" })
    });
    console.log(`Unauthenticated status: ${res.status}`);

    console.log('\n--- Step 9: Security boundaries (Invalid history) ---');
    res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentAuth.token}` },
      body: JSON.stringify({ message: "Hello", history: [{ role: "system", content: "hack" }] })
    });
    console.log(`Invalid history status: ${res.status}`);

    // Concurrency test
    console.log('\n--- Step 11: Concurrency test ---');
    const promises = [
      fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentAuth.token}` },
        body: JSON.stringify({ message: "What is my team name?" })
      }).then(r => r.json()),
      fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${evaluatorAuth.token}` },
        body: JSON.stringify({ message: "What events am I assigned to evaluate?" })
      }).then(r => r.json())
    ];
    const results = await Promise.all(promises);
    console.log("Student response:", results[0]);
    console.log("Evaluator response:", results[1]);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

runE2ETests();
