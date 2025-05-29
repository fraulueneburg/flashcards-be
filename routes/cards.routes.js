const mongoose = require('mongoose')
const express = require('express')
const router = express.Router()
const Cards = require('../models/Cards.model')
const Tags = require('../models/Tags.model')

router.get('/', async (req, res) => {
	try {
		const foundCardsArr = await Cards.find().populate({ path: 'tags', select: '-cards' })
		res.json(foundCardsArr)
	} catch (error) {
		console.error('Error fetching cards:', error)
		res.status(500).json({ message: 'Error fetching cards' })
	}
})

router.post('/', async (req, res) => {
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

router.put('/:id', async (req, res) => {
	const { id } = req.params
	const { content_front, content_back, tags: newTagsArr } = req.body

	try {
		const foundCard = await Cards.findById(id)
		if (!foundCard) return res.status(404).json({ message: 'Update Error: Card ID not found' })

		// prepare tags
		const existingTagIds = foundCard.tags
		const newTagIds = newTagsArr.map((elem) => elem._id)

		// list of IDs that were in old but are no longer in new
		const tagIdsToRemove = existingTagIds.filter((elem) => !new Set(newTagIds).has(elem._id.toString()))

		foundCard.content_front = content_front
		foundCard.content_back = content_back
		foundCard.tags = []
		await foundCard.save()

		// PROCESS NEW TAGS
		// exists with card  ->  leave as is
		// exists w/o card   ->  link
		// does not exist    ->  create new + link
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

router.patch('/:id/review', async (req, res) => {
	const { id } = req.params
	const { isCorrectAnswer } = req.body

	try {
		const foundCard = await Cards.findById(id)
		if (!foundCard) return res.status(404).json({ message: 'Update Error: Card ID not found' })
		const box = foundCard.box

		if (isCorrectAnswer === true) {
			const daysUntilNextReview = [2, 7, 14, 28, 28]

			foundCard.difficult = false
			foundCard.reviewDate = new Date(Date.now() + daysUntilNextReview[box - 1] * 86400000)
			if (box < 5) {
				foundCard.box += 1
			} else {
				foundCard.retired = true
				foundCard.reviewDate = new Date(Date.now() + 365 * 100 * 86400000)
			}
		} else {
			foundCard.difficult = true
			foundCard.retired = false
			foundCard.reviewDate = new Date()
			foundCard.box = 1
		}
		foundCard.lastReviewDate = new Date()
		await foundCard.save()
		res.status(200).json(foundCard)
	} catch (error) {
		console.error(error)
		res.status(500).json({ message: 'Error while handling card review.' })
	}
})

router.delete('/:id', async (req, res) => {
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
