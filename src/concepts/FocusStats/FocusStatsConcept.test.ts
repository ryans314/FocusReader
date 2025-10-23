import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertStrictEquals,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import FocusStatsConcept from "./FocusStatsConcept.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

Deno.test("FocusStats Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const focusStatsConcept = new FocusStatsConcept(db);

  // Define some test IDs
  const userA: ID = "user:Alice" as ID;
  const userB: ID = "user:Bob" as ID;
  const doc1: ID = "document:Doc1" as ID;
  const doc2: ID = "document:Doc2" as ID;
  const libraryA: ID = "library:AliceLib" as ID; // Placeholder for external library concept

  // --- Test initUser action ---
  await t.step(
    "initUser: should successfully initialize FocusStats for a new user",
    async () => {
      console.log("\n--- Testing initUser (success) ---");
      const result = await focusStatsConcept.initUser({ user: userA });
      assertExists(result);
      assertNotEquals(
        (result as { error: string }).error,
        "User Alice already has FocusStats initialized.",
      ); // Ensure it's not an error

      const { focusStats: userAFocusStatsId } = result as { focusStats: ID };
      console.log(`initUser(${userA}): FocusStats ID = ${userAFocusStatsId}`);

      // Verify state
      const fetchedStats = await focusStatsConcept._viewStats({ user: userA });
      assertExists(fetchedStats);
      assertEquals((fetchedStats as Array<any>).length, 1);
      assertEquals(
        (fetchedStats as Array<any>)[0].focusStats.id,
        userAFocusStatsId,
      );
      assertEquals((fetchedStats as Array<any>)[0].focusStats.user, userA);
      assertEquals(
        (fetchedStats as Array<any>)[0].focusStats.focusSessionIds.length,
        0,
      );
      console.log(
        `Verified FocusStats for ${userA}: ${
          JSON.stringify((fetchedStats as Array<any>)[0].focusStats)
        }`,
      );
    },
  );

  await t.step(
    "initUser: should return an error if FocusStats already exists for the user",
    async () => {
      console.log("\n--- Testing initUser (duplicate) ---");
      const result = await focusStatsConcept.initUser({ user: userA });
      assertExists(result);
      assertEquals(
        (result as { error: string }).error,
        `User ${userA} already has FocusStats initialized.`,
      );
      console.log(
        `initUser(${userA}): Attempted re-initialization returned error: "${
          (result as { error: string }).error
        }"`,
      );
    },
  );

  // Initialize userB for subsequent tests
  const userBFocusStatsResult = await focusStatsConcept.initUser({
    user: userB,
  });
  const userBFocusStatsId =
    (userBFocusStatsResult as { focusStats: ID }).focusStats;
  console.log(
    `\nSetup: Initialized FocusStats for ${userB} (ID: ${userBFocusStatsId})`,
  );

  // --- Test startSession action ---
  await t.step(
    "startSession: should successfully create a new focus session",
    async () => {
      console.log("\n--- Testing startSession (success) ---");
      const result = await focusStatsConcept.startSession({
        user: userA,
        document: doc1,
        library: libraryA,
      });
      assertExists(result);
      assertNotEquals(
        (result as { error: string }).error,
        "User does not have FocusStats initialized.",
      ); // Ensure it's not an error

      const { focusSession: session1Id } = result as { focusSession: ID };
      console.log(
        `startSession(${userA}, ${doc1}): Session ID = ${session1Id}`,
      );

      // Verify state: session exists and endTime is null
      const sessions = await focusStatsConcept._getSessions({ user: userA });
      assertExists(sessions);
      assertEquals(
        (sessions as Array<any>).some((s) =>
          s.focusSession._id === session1Id && s.focusSession.endTime === null
        ),
        true,
      );
      console.log(`Verified session ${session1Id} started for ${userA}.`);
    },
  );

  await t.step(
    "startSession: should return an error if user's FocusStats is not initialized",
    async () => {
      console.log("\n--- Testing startSession (no FocusStats) ---");
      const nonExistentUser: ID = "user:NonExistent" as ID;
      const result = await focusStatsConcept.startSession({
        user: nonExistentUser,
        document: doc1,
        library: libraryA,
      });
      assertExists(result);
      assertEquals(
        (result as { error: string }).error,
        `User ${nonExistentUser} does not have FocusStats initialized.`,
      );
      console.log(
        `startSession(${nonExistentUser}): Returned error: "${
          (result as { error: string }).error
        }"`,
      );
    },
  );

  // Get a session ID for userA to test endSession
  const sessionResult = await focusStatsConcept.startSession({
    user: userA,
    document: doc2,
    library: libraryA,
  });
  const session2Id = (sessionResult as { focusSession: ID }).focusSession;
  console.log(
    `\nSetup: Started another session for ${userA} (ID: ${session2Id}) for endSession tests.`,
  );

  // --- Test endSession action ---
  await t.step(
    "endSession: should successfully end an active focus session",
    async () => {
      console.log("\n--- Testing endSession (success) ---");
      const result = await focusStatsConcept.endSession({
        focusSession: session2Id,
      });
      assertExists(result);
      assertNotEquals(
        (result as { error: string }).error,
        "FocusSession not found.",
      ); // Ensure it's not an error

      const { focusSession: endedSessionId } = result as { focusSession: ID };
      assertStrictEquals(endedSessionId, session2Id);
      console.log(`endSession(${session2Id}): Session ID = ${endedSessionId}`);

      // Verify state: session endTime is set, and session is linked to user's FocusStats
      const sessions = await focusStatsConcept._getSessions({ user: userA });
      assertExists(sessions);
      assertEquals(
        (sessions as Array<any>).some((s) =>
          s.focusSession._id === session2Id && s.focusSession.endTime !== null
        ),
        true,
      );

      const userStats = await focusStatsConcept._viewStats({ user: userA });
      assertExists(userStats);
      assertEquals(
        (userStats as Array<any>)[0].focusStats.focusSessionIds.includes(
          session2Id,
        ),
        true,
      );
      console.log(
        `Verified session ${session2Id} ended for ${userA} and linked to FocusStats.`,
      );
    },
  );

  await t.step(
    "endSession: should return an error if the focus session does not exist",
    async () => {
      console.log("\n--- Testing endSession (non-existent) ---");
      const nonExistentSession: ID = freshID();
      const result = await focusStatsConcept.endSession({
        focusSession: nonExistentSession,
      });
      assertExists(result);
      assertEquals(
        (result as { error: string }).error,
        `FocusSession ${nonExistentSession} not found.`,
      );
      console.log(
        `endSession(${nonExistentSession}): Returned error: "${
          (result as { error: string }).error
        }"`,
      );
    },
  );

  await t.step(
    "endSession: should return an error if the focus session has already ended",
    async () => {
      console.log("\n--- Testing endSession (already ended) ---");
      const result = await focusStatsConcept.endSession({
        focusSession: session2Id,
      }); // Try to end again
      assertExists(result);
      assertEquals(
        (result as { error: string }).error,
        `FocusSession ${session2Id} has already ended.`,
      );
      console.log(
        `endSession(${session2Id}): Returned error (already ended): "${
          (result as { error: string }).error
        }"`,
      );
    },
  );

  // Start another session for userB to test removeSession
  const session3Result = await focusStatsConcept.startSession({
    user: userB,
    document: doc1,
    library: libraryA,
  });
  const session3Id = (session3Result as { focusSession: ID }).focusSession;
  await focusStatsConcept.endSession({ focusSession: session3Id }); // End it so it's in FocusStats
  console.log(
    `\nSetup: Started and ended session for ${userB} (ID: ${session3Id}) for removeSession tests.`,
  );

  // --- Test removeSession action ---
  await t.step(
    "removeSession: should successfully remove a focus session and its reference from FocusStats",
    async () => {
      console.log("\n--- Testing removeSession (success) ---");
      const result = await focusStatsConcept.removeSession({
        focusSession: session3Id,
      });
      assertExists(result);
      assertNotEquals(
        (result as { error: string }).error,
        "FocusSession not found.",
      ); // Ensure it's not an error
      assertEquals(Object.keys(result).length, 0); // Should return Empty

      console.log(`removeSession(${session3Id}): Successfully removed.`);

      // Verify state: session no longer exists and is not linked to user's FocusStats
      const sessions = await focusStatsConcept._getSessions({ user: userB });
      assertExists(sessions);
      assertEquals(
        (sessions as Array<any>).some((s) => s.focusSession._id === session3Id),
        false,
      );

      const userStats = await focusStatsConcept._viewStats({ user: userB });
      assertExists(userStats);
      assertEquals(
        (userStats as Array<any>)[0].focusStats.focusSessionIds.includes(
          session3Id,
        ),
        false,
      );
      console.log(
        `Verified session ${session3Id} removed from ${userB}'s sessions and FocusStats.`,
      );
    },
  );

  await t.step(
    "removeSession: should return an error if the focus session does not exist",
    async () => {
      console.log("\n--- Testing removeSession (non-existent) ---");
      const nonExistentSession: ID = freshID();
      const result = await focusStatsConcept.removeSession({
        focusSession: nonExistentSession,
      });
      assertExists(result);
      assertEquals(
        (result as { error: string }).error,
        `FocusSession ${nonExistentSession} not found.`,
      );
      console.log(
        `removeSession(${nonExistentSession}): Returned error: "${
          (result as { error: string }).error
        }"`,
      );
    },
  );

  // --- Test _viewStats query ---
  await t.step(
    "_viewStats: should successfully retrieve focus stats for a user",
    async () => {
      console.log("\n--- Testing _viewStats (success) ---");
      const result = await focusStatsConcept._viewStats({ user: userA });
      assertExists(result);
      assertNotEquals(
        (result as { error: string }).error,
        "FocusStats not found for user.",
      ); // Ensure it's not an error

      const stats = (result as Array<any>)[0].focusStats;
      assertExists(stats.id);
      assertEquals(stats.user, userA);
      assertEquals(stats.focusSessionIds.includes(session2Id), true);
      console.log(
        `_viewStats(${userA}): Retrieved stats: ${JSON.stringify(stats)}`,
      );
    },
  );

  await t.step(
    "_viewStats: should return an error if FocusStats is not initialized for the user",
    async () => {
      console.log("\n--- Testing _viewStats (no FocusStats) ---");
      const nonExistentUser: ID = "user:Unknown" as ID;
      const result = await focusStatsConcept._viewStats({
        user: nonExistentUser,
      });
      assertExists(result);
      assertEquals(
        (result as { error: string }).error,
        `FocusStats not found for user ${nonExistentUser}.`,
      );
      console.log(
        `_viewStats(${nonExistentUser}): Returned error: "${
          (result as { error: string }).error
        }"`,
      );
    },
  );

  // --- Test _getSessions query ---
  await t.step(
    "_getSessions: should successfully retrieve all sessions for a user",
    async () => {
      console.log("\n--- Testing _getSessions (success) ---");
      const result = await focusStatsConcept._getSessions({ user: userA });
      assertExists(result);
      assertNotEquals(
        (result as { error: string }).error,
        "FocusStats not found for user.",
      ); // Ensure it's not an error

      const sessions = result as Array<{ focusSession: any }>;
      assertEquals(sessions.length, 2); // userA has two sessions (session1Id, session2Id)
      assertEquals(
        sessions.some((s) => s.focusSession._id === session2Id),
        true,
      );
      assertEquals(sessions.some((s) => s.focusSession.endTime === null), true); // session1Id is still active
      assertEquals(sessions.some((s) => s.focusSession.endTime !== null), true); // session2Id is ended
      console.log(
        `_getSessions(${userA}): Retrieved sessions: ${
          JSON.stringify(sessions)
        }`,
      );
    },
  );

  await t.step(
    "_getSessions: should return an error if FocusStats is not initialized for the user",
    async () => {
      console.log("\n--- Testing _getSessions (no FocusStats) ---");
      const nonExistentUser: ID = "user:Stranger" as ID;
      const result = await focusStatsConcept._getSessions({
        user: nonExistentUser,
      });
      assertExists(result);
      assertEquals(
        (result as { error: string }).error,
        `FocusStats not found for user ${nonExistentUser}. Cannot retrieve sessions.`,
      );
      console.log(
        `_getSessions(${nonExistentUser}): Returned error: "${
          (result as { error: string }).error
        }"`,
      );
    },
  );

  // --- Principle Trace Test ---
  await t.step(
    "Principle Trace: Demonstrate tracking and viewing reading statistics",
    async () => {
      console.log("\n--- Principle Trace ---");
      const testUser: ID = "user:PrincipleUser" as ID;
      const testDocA: ID = "document:PrincipleDocA" as ID;
      const testDocB: ID = "document:PrincipleDocB" as ID;
      const testLib: ID = "library:PrincipleLib" as ID;

      console.log(`1. Initialize FocusStats for ${testUser}`);
      const initResult = await focusStatsConcept.initUser({ user: testUser });
      const { focusStats: principleUserStatsId } = initResult as {
        focusStats: ID;
      };
      assertExists(principleUserStatsId);
      console.log(`   FocusStats created with ID: ${principleUserStatsId}`);

      console.log(`2. Start a reading session for ${testUser} on ${testDocA}`);
      const startSession1Result = await focusStatsConcept.startSession({
        user: testUser,
        document: testDocA,
        library: testLib,
      });
      const { focusSession: sessionP1Id } = startSession1Result as {
        focusSession: ID;
      };
      assertExists(sessionP1Id);
      console.log(`   Session 1 started with ID: ${sessionP1Id}`);

      console.log(
        `3. Start another reading session for ${testUser} on ${testDocB}`,
      );
      const startSession2Result = await focusStatsConcept.startSession({
        user: testUser,
        document: testDocB,
        library: testLib,
      });
      const { focusSession: sessionP2Id } = startSession2Result as {
        focusSession: ID;
      };
      assertExists(sessionP2Id);
      console.log(`   Session 2 started with ID: ${sessionP2Id}`);

      // Simulate some time passing or context switching

      console.log(`4. End the first reading session (${sessionP1Id})`);
      const endSession1Result = await focusStatsConcept.endSession({
        focusSession: sessionP1Id,
      });
      assertExists(endSession1Result);
      console.log(`   Session 1 ended.`);

      console.log(`5. View statistics for ${testUser}`);
      const viewStatsResult = await focusStatsConcept._viewStats({
        user: testUser,
      });
      assertExists(viewStatsResult);
      const stats = (viewStatsResult as Array<any>)[0].focusStats;
      console.log(`   Retrieved stats: ${JSON.stringify(stats)}`);
      assertEquals(
        stats.focusSessionIds.includes(sessionP1Id),
        true,
        "SessionP1Id should be in stats after ending.",
      );
      assertEquals(
        stats.focusSessionIds.includes(sessionP2Id),
        false,
        "SessionP2Id should NOT be in stats before ending.",
      );

      console.log(`6. End the second reading session (${sessionP2Id})`);
      const endSession2Result = await focusStatsConcept.endSession({
        focusSession: sessionP2Id,
      });
      assertExists(endSession2Result);
      console.log(`   Session 2 ended.`);

      console.log(`7. View statistics for ${testUser} again`);
      const viewStatsResultAgain = await focusStatsConcept._viewStats({
        user: testUser,
      });
      assertExists(viewStatsResultAgain);
      const statsAgain = (viewStatsResultAgain as Array<any>)[0].focusStats;
      console.log(`   Retrieved updated stats: ${JSON.stringify(statsAgain)}`);
      assertEquals(
        statsAgain.focusSessionIds.includes(sessionP1Id),
        true,
        "SessionP1Id should still be in stats.",
      );
      assertEquals(
        statsAgain.focusSessionIds.includes(sessionP2Id),
        true,
        "SessionP2Id should now be in stats.",
      );
      assertEquals(
        statsAgain.focusSessionIds.length,
        2,
        "Should have two ended sessions in stats.",
      );

      console.log(`8. Get all detailed sessions for ${testUser}`);
      const getSessionsResult = await focusStatsConcept._getSessions({
        user: testUser,
      });
      assertExists(getSessionsResult);
      const detailedSessions = getSessionsResult as Array<
        { focusSession: any }
      >;
      console.log(`   Detailed sessions: ${JSON.stringify(detailedSessions)}`);
      assertEquals(
        detailedSessions.length,
        2,
        "Should retrieve all 2 sessions.",
      );
      assertEquals(
        detailedSessions.some((s) =>
          s.focusSession._id === sessionP1Id && s.focusSession.endTime !== null
        ),
        true,
        "Session P1 should be present and ended.",
      );
      assertEquals(
        detailedSessions.some((s) =>
          s.focusSession._id === sessionP2Id && s.focusSession.endTime !== null
        ),
        true,
        "Session P2 should be present and ended.",
      );
      console.log(
        "Principle trace successfully demonstrated: sessions tracked and aggregated for viewing.",
      );
    },
  );

  await client.close();
});
