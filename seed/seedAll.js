// seedAll.js:

import seedServer from "./seedServer.js";
import ServerModel from "./serverModel.js";

export default async function PopulateServer(db) {
  try {
    await db.connect();
    const model = new ServerModel(db);
  } catch (err) {
    console.error(err.message);
  }
}
