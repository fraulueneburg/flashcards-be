const express = require('express')
const router = express.Router()
const Collections = require('../models/Collections.model')

// router.get('/all', isAuthenticated, async (req, res) => {
// const userId = req.payload._id
router.get('/all', async (req, res) => {
	try {
		const foundCollectionsArr = await Collections.find()
		res.json(foundCollectionsArr)
	} catch (error) {
		console.error('Error fetching cards:', error)
		res.status(500).json({ message: 'Error fetching cards' })
	}
})

// Create a new collection
router.post('/new', async (req, res) => {
	try {
		const { name, cardIds } = req.body
		const newCollection = new Collection({
			name,
			cards: cardIds, // Array of Card ObjectIds
		})
		await newCollection.save()
		res.status(201).json(newCollection)
	} catch (error) {
		res.status(400).json({ message: error.message })
	}
})

// Get a collection with populated card data
router.get('/:id', async (req, res) => {
	try {
		const collection = await Collection.findById(req.params.id).populate('cards')
		if (!collection) {
			return res.status(404).json({ message: 'Collection not found' })
		}
		res.json(collection)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
})

// Add a card to a collection
router.post('/:id/cards', async (req, res) => {
	try {
		const { cardId } = req.body
		const collection = await Collection.findById(req.params.id)
		if (!collection) {
			return res.status(404).json({ message: 'Collection not found' })
		}
		collection.cards.push(cardId)
		await collection.save()
		res.json(collection)
	} catch (error) {
		res.status(400).json({ message: error.message })
	}
})

module.exports = router
