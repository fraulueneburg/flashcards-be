const mongoose = require('mongoose')
const express = require('express')
const router = express.Router()
const Cards = require('../models/Cards.model')
const Tags = require('../models/Tags.model')

// router.get('/all', isAuthenticated, async (req, res) => {
// const userId = req.payload._id

router.get('/all', async (req, res) => {
	try {
		const foundCardsArr = await Cards.find().populate({ path: 'tags', select: '-cards' })
		res.json(foundCardsArr)
	} catch (error) {
		console.error('Error fetching cards:', error)
		res.status(500).json({ message: 'Error fetching cards' })
	}
})

// add card to existing tag
// or create a new one

// const handleTag = async (tag, newCard) => {
// 	let theTag
// 	let foundTag = await Tags.findById(tag._id)

// 	foundTag
// 		? (theTag = foundTag)
// 		: (theTag = await Tags.create({
// 				name: tag.name,
// 				color: tag.color,
// 				cards: [],
// 		  }))
// 	theTag.cards.push(newCard._id)
// 	await theTag.save()
// 	return theTag._id
// }

router.post('/add', async (req, res) => {
	const { content_front, content_back, tags = [] } = req.body

	const handleTag = async (tag, newCard) => {
		const { _id, name, color } = tag
		const isValidId = mongoose.Types.ObjectId.isValid(_id)
		let theTag

		if (isValidId) {
			theTag = await Tags.findOneAndUpdate({ _id }, { $addToSet: { cards: newCard._id } }, { new: true })
		} else {
			theTag = await Tags.create({
				name: name,
				color: color,
				cards: [newCard._id],
			})
		}
		return theTag._id
	}

	try {
		const newCard = await Cards.create({
			content_front,
			content_back,
			tags: [],
		})
		newCard.tags = await Promise.all(tags.map((tag) => handleTag(tag, newCard)))
		await newCard.save()
		const populatedCard = await Cards.findById(newCard._id).populate('tags')
		res.status(201).json(populatedCard)
	} catch (error) {
		console.error(error)
		res.status(error.statusCode || 500).json({ message: error.message })
	}
})

router.post('/:id/update', async (req, res) => {
	const { id } = req.params
	const { content_front, content_back, tags: newTagsArr } = req.body

	try {
		const foundCard = await Cards.findById(id)
		if (!foundCard) return res.status(404).json({ message: 'Update Error: Card ID not found' })

		// prepare tags
		const oldTagsIds = foundCard.tags
		const newTagsIds = newTagsArr.map((elem) => elem._id)

		// generate a list of IDs that were in old but are no longer in new
		const tagIdsToRemove = oldTagsIds.filter((elem) => !new Set(newTagsIds).has(elem._id.toString()))

		foundCard.content_front = content_front
		foundCard.content_back = content_back
		foundCard.tags = []
		await foundCard.save()

		// Process new tags
		// exists with card      => leave as is
		// exists without card   => link
		// does not exist        => create new + link
		for (const tag of newTagsArr) {
			const { name, color, _id } = tag
			const isValidId = mongoose.Types.ObjectId.isValid(_id)

			if (isValidId) {
				const foundTag = await Tags.findById(_id)

				if (foundTag) {
					const cardExists = foundTag.cards.includes(foundCard._id)

					if (!cardExists) {
						foundTag.cards.push(foundCard._id)
						await foundTag.save()
					}

					foundCard.tags.push(foundTag._id)
					await foundCard.save()
				}
			} else {
				const newTag = await Tags.create({
					name,
					color,
					cards: [foundCard._id],
				})
				foundCard.tags.push(newTag._id)
				await foundCard.save()
			}
		}

		// Remove old tags, delete orphaned
		for (const tagId of tagIdsToRemove) {
			const foundTag = await Tags.findByIdAndUpdate(tagId, { $pull: { cards: foundCard._id } }, { new: true })
			if (foundTag && foundTag.cards.length === 0) {
				await Tags.findByIdAndDelete(tagId)
			}
		}
		const populatedCard = await Cards.findById(id).populate('tags')
		res.status(200).json(populatedCard)
	} catch (error) {
		console.error(error)
		res.status(500).json({ message: 'Error while updating card.' })
	}
})

router.delete('/:id/delete', async (req, res) => {
	const { id } = req.params
	const foundCard = await Cards.findById(id)
	const tagsArr = foundCard.tags

	for (const tagId of tagsArr) {
		const foundTag = await Tags.findByIdAndUpdate(tagId, { $pull: { cards: foundCard._id } }, { new: true })
		if (foundTag && foundTag.cards.length === 0) {
			await Tags.findByIdAndDelete(tagId)
		}
	}

	try {
		await Cards.findByIdAndDelete({ _id: id })
		res.status(200).json({ message: 'Card deleted successfully' })
	} catch (err) {
		console.log(err)
	}
})

module.exports = router
