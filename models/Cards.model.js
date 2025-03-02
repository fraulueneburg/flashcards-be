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
	box: { type: Number, default: 1 },
	reviewDate: { type: Date, default: Date.now },
	lastReviewDate: { type: Date, default: Date.now },
	difficult: { type: Boolean, default: false },
	retired: { type: Boolean, default: false },
	statistics: {
		guesses: {
			total: { type: Number, default: 0 },
			correct: { type: Number, default: 0 },
		},
	},
	createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Cards', CardsSchema)
