const mongoose = require('mongoose')

const TagsSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	color: {
		type: String,
		required: true,
	},
	cards: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Cards',
		},
	],
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

module.exports = mongoose.model('Tags', TagsSchema)
