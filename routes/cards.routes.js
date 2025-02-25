const mongoose = require('mongoose')
const express = require('express')
const router = express.Router()
const Cards = require('../models/Cards.model')
const Collections = require('../models/Collections.model')

// router.get('/all', isAuthenticated, async (req, res) => {
// const userId = req.payload._id

router.get('/all', async (req, res) => {
	try {
		const foundCardsArr = await Cards.find().populate({ path: 'collections', select: '-cards' })
		res.json(foundCardsArr)
	} catch (error) {
		console.error('Error fetching cards:', error)
		res.status(500).json({ message: 'Error fetching cards' })
	}
})

// add card to existing collection
// or create a new one

// const handleCollection = async (collection, newCard) => {
// 	let theCollection
// 	let foundCollection = await Collections.findById(collection._id)

// 	foundCollection
// 		? (theCollection = foundCollection)
// 		: (theCollection = await Collections.create({
// 				name: collection.name,
// 				color: collection.color,
// 				cards: [],
// 		  }))
// 	theCollection.cards.push(newCard._id)
// 	await theCollection.save()
// 	return theCollection._id
// }

router.post('/add', async (req, res) => {
	const { content_front, content_back, collections = [] } = req.body
	const handleCollection = async (collection, newCard) => {
		const { _id, name, color } = collection
		const isValidId = mongoose.Types.ObjectId.isValid(_id)
		let theCollection

		if (isValidId) {
			theCollection = await Collections.findOneAndUpdate({ _id }, { $addToSet: { cards: newCard._id } }, { new: true })
		} else {
			theCollection = await Collections.create({
				name: name,
				color: color,
				cards: [newCard._id],
			})
		}
		return theCollection._id
	}

	try {
		const newCard = await Cards.create({
			content_front,
			content_back,
			collections: [],
		})
		newCard.collections = await Promise.all(collections.map((collection) => handleCollection(collection, newCard)))
		await newCard.save()
		const populatedCard = await Cards.findById(newCard._id).populate('collections')
		res.status(201).json(populatedCard)
	} catch (error) {
		console.error(error)
		res.status(error.statusCode || 500).json({ message: error.message })
	}
})

router.post('/:id/update', async (req, res) => {
	const { id } = req.params
	const { content_front, content_back, collections: newCollectionsArr } = req.body

	try {
		const foundCard = await Cards.findById(id)
		if (!foundCard) return res.status(404).json({ message: 'Update Error: Card ID not found' })

		// prepare collections
		const oldCollectionsIds = foundCard.collections
		const newCollectionsIds = newCollectionsArr.map((elem) => elem._id)

		// generate a list of IDs that were in old but are no longer in new
		const collectionIdsToRemove = oldCollectionsIds.filter((elem) => !new Set(newCollectionsIds).has(elem._id.toString()))

		foundCard.content_front = content_front
		foundCard.content_back = content_back
		foundCard.collections = []
		await foundCard.save()

		// Process new collections
		// exists with card      => leave as is
		// exists without card   => link
		// does not exist        => create new + link
		for (const collection of newCollectionsArr) {
			const { name, color, _id } = collection
			const isValidId = mongoose.Types.ObjectId.isValid(_id)

			if (isValidId) {
				const foundCollection = await Collections.findById(_id)

				if (foundCollection) {
					const cardExists = foundCollection.cards.includes(foundCard._id)

					if (!cardExists) {
						foundCollection.cards.push(foundCard._id)
						await foundCollection.save()
					}

					foundCard.collections.push(foundCollection._id)
					await foundCard.save()
				}
			} else {
				const newCollection = await Collections.create({
					name,
					color,
					cards: [foundCard._id],
				})
				foundCard.collections.push(newCollection._id)
				await foundCard.save()
			}
		}

		// Remove old collections, delete orphaned
		for (const collectionId of collectionIdsToRemove) {
			const foundCollection = await Collections.findByIdAndUpdate(
				collectionId,
				{ $pull: { cards: foundCard._id } },
				{ new: true }
			)
			if (foundCollection && foundCollection.cards.length === 0) {
				await Collections.findByIdAndDelete(collectionId)
			}
		}
		const populatedCard = await Cards.findById(id).populate('collections')
		res.status(200).json(populatedCard)
	} catch (error) {
		console.error(error)
		res.status(500).json({ message: 'Error while updating card.' })
	}
})

router.delete('/:id/delete', async (req, res) => {
	const { id } = req.params
	const foundCard = await Cards.findById(id)
	const collectionsArr = foundCard.collections

	for (const collectionId of collectionsArr) {
		const foundCollection = await Collections.findByIdAndUpdate(
			collectionId,
			{ $pull: { cards: foundCard._id } },
			{ new: true }
		)
		if (foundCollection && foundCollection.cards.length === 0) {
			await Collections.findByIdAndDelete(collectionId)
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
