/**
 *
 * @param {number} maxSize max size of the array before removing the first half
 */
class NoDups {
	constructor(maxSize = 100) {
		this.items = [];
		this.maxSize = maxSize;
	}
    /**
     *
     * @param {string} id unique id
     * @throws if the id is not a unique item in the items list
     */
	addItem(id) {

		if (this.items.includes(id)) throw new Error(`This id is not unique: ${id}`);
		
		this.items.push(id);

		if (this.items.length > this.maxSize) {
			this.items.splice(0, this.maxSize / 2);
		}
	}
}

module.exports = NoDups;
