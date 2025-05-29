const express = require('express')
const router = express.Router()
const Tags = require('../models/Tags.model')

router.get('/', async (req, res) => {
	try {
		const foundTagsArr = await Tags.find()
		res.json(foundTagsArr)
	} catch (error) {
		console.error('Error fetching cards:', error)
		res.status(500).json({ message: 'Error fetching cards' })
	}
})

module.exports = router
