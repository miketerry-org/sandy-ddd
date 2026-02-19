// migration.js

export default class Migration {
  constructor(id, description) {
    this.id = id;
    this.description = description;

    this.up = [];
    this.down = [];

    this.timestampCreated = new Date();
    this.checksum = null;
  }

  setChecksum(checksum) {
    this.checksum = checksum;
  }
}
