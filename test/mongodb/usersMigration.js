/**
 * @file usersMigration.js
 * Example MongoDB migration that creates and seeds a "users" collection.
 */

export default {
  name: "usersMigration",

  /**
   * Migrate up: create and seed the 'users' collection
   */
  async up(db) {
    const collections = await db.listCollections().toArray();
    const exists = collections.some(c => c.name === "users");

    if (!exists) {
      await db.createCollection("users");
      console.log("✅ Created 'users' collection.");
    }

    const usersCollection = db.collection("users");

    // Insert sample user documents if empty
    const count = await usersCollection.countDocuments();
    if (count === 0) {
      await usersCollection.insertMany([
        { name: "Alice", email: "alice@example.com", createdAt: new Date() },
        { name: "Bob", email: "bob@example.com", createdAt: new Date() },
        {
          name: "Charlie",
          email: "charlie@example.com",
          createdAt: new Date(),
        },
      ]);
      console.log("✅ Inserted sample users.");
    } else {
      console.log("ℹ️ 'users' collection already populated.");
    }
  },

  /**
   * Migrate down: drop the 'users' collection
   */
  async down(db) {
    const collections = await db.listCollections().toArray();
    const exists = collections.some(c => c.name === "users");

    if (exists) {
      await db.collection("users").drop();
      console.log("🗑️ Dropped 'users' collection.");
    } else {
      console.log("ℹ️ 'users' collection does not exist, skipping drop.");
    }
  },
};
