const mongoose = require('mongoose')

const CardsSchema = new mongoose.Schema({
	content_front: String,
	content_back: String,
	collections: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Collections',
		},
	],
	createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Cards', CardsSchema)
