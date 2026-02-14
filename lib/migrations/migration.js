// migration.js

export default class Migration {
  /**
   * @param {string} id
   * @param {string} description
   * @param {Array<Object>} upOperations
   * @param {Array<Object>} downOperations
   */
  constructor(id, description, upOperations = [], downOperations = []) {
    this.id = id;
    this.description = description;
    this.up = upOperations;
    this.down = downOperations;
    this.timestampCreated = new Date();
    this.checksum = null; // optional: could compute from operations
  }

  setChecksum(checksum) {
    this.checksum = checksum;
  }
}
