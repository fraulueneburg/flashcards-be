const express = require('express')
const router = express.Router()
const Tags = require('../models/Tags.model')

// router.get('/all', isAuthenticated, async (req, res) => {
// const userId = req.payload._id
router.get('/all', async (req, res) => {
	try {
		const foundTagsArr = await Tags.find()
		res.json(foundTagsArr)
	} catch (error) {
		console.error('Error fetching cards:', error)
		res.status(500).json({ message: 'Error fetching cards' })
	}
})

// Create a new tag
router.post('/new', async (req, res) => {
	try {
		const { name, cardIds } = req.body
		const newTag = new Tag({
			name,
			cards: cardIds, // Array of Card ObjectIds
		})
		await newTag.save()
		res.status(201).json(newTag)
	} catch (error) {
		res.status(400).json({ message: error.message })
	}
})

// Get a tag with populated card data
router.get('/:id', async (req, res) => {
	try {
		const tag = await Tag.findById(req.params.id).populate('cards')
		if (!tag) {
			return res.status(404).json({ message: 'Tag not found' })
		}
		res.json(tag)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
})

// Add a card to a tag
router.post('/:id/cards', async (req, res) => {
	try {
		const { cardId } = req.body
		const tag = await Tag.findById(req.params.id)
		if (!tag) {
			return res.status(404).json({ message: 'Tag not found' })
		}
		tag.cards.push(cardId)
		await tag.save()
		res.json(tag)
	} catch (error) {
		res.status(400).json({ message: error.message })
	}
})

module.exports = router
