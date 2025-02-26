const mongoose = require('mongoose')

const CardsSchema = new mongoose.Schema({
	content_front: String,
	content_back: String,
	tags: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Tags',
		},
	],
	createdAt: { type: Date, default: Date.now },
	statistics: {
		dueDate: { type: Date, default: Date.now },
		guessesTotal: { type: Number, default: 0 },
		guessesCorrect: { type: Number, default: 0 },
	},
})

module.exports = mongoose.model('Cards', CardsSchema)
