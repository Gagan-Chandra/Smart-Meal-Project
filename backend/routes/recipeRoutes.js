const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const { authenticateToken } = require('../middleware/authMiddleware');
const nlp = require('compromise');

// Spoonacular API Key
const API_KEY = process.env.API_KEY || '4f73f2fd6ba9459999c0c9b9d0edabf1';

// Unsplash API URL and Access Key
const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';
const UNSPLASH_ACCESS_KEY = 'gS6GRMribrGN2SBcrh47JhHtKGTF5Gp9X5q5h1LNbWk'; // Replace with your access key

// Placeholder Image
const DEFAULT_IMAGE = 'https://via.placeholder.com/150?text=No+Image';

// Load local recipes from `recipes.csv`
let localRecipes = [];
fs.createReadStream(path.join(__dirname, '../data/recipes.csv'))
    .pipe(
        csvParser({
            headers: ['Name', 'RecipeInstructions', ...Array(24).fill('_')],
            skipLines: 1,
            quote: '"',
            escape: '"'
        })
    )
    .on('data', (row) => {
        const instructionsRaw = row.RecipeInstructions || row._26 || '';
        const instructions = instructionsRaw.replace(/^c\(|\)$/g, '')
            .replace(/\\n/g, ' ')
            .replace(/"/g, '');
        localRecipes.push({
            name: row.Name?.toLowerCase() || 'unknown',
            instructions: instructions || 'No instructions available.',
        });
    })
    .on('end', () => {
        console.log('Local recipes loaded:', localRecipes.length);
    })
    .on('error', (err) => {
        console.error('Error loading local recipes:', err.message);
    });

// Function to fetch an image from Unsplash with caching using Redis
const fetchRecipeImage = async (recipeName, redisClient, rabbitMqChannel) => {
    try {
        // Check Redis cache
        const cachedImage = await redisClient.get(`recipeImage:${recipeName}`);
        if (cachedImage) {
            console.log(`Cache hit for recipe: ${recipeName}`);
            return cachedImage;
        }

        // Fetch from Unsplash
        const response = await axios.get(UNSPLASH_API_URL, {
            params: {
                query: recipeName,
                client_id: UNSPLASH_ACCESS_KEY,
                per_page: 1,
            },
        });

        const imageUrl = response.data.results.length > 0
            ? response.data.results[0].urls.small
            : DEFAULT_IMAGE;

        // Cache the image URL in Redis (24-hour expiration)
        await redisClient.setEx(`recipeImage:${recipeName}`, 86400, imageUrl);

        // Queue image fetch task to RabbitMQ for logging or further processing
        if (rabbitMqChannel) {
            rabbitMqChannel.sendToQueue('imageQueue', Buffer.from(recipeName));
            console.log(`Image fetch task queued for: ${recipeName}`);
        }

        return imageUrl;
    } catch (error) {
        console.error('Error fetching image from Unsplash:', error.message || error.response?.data);
        return DEFAULT_IMAGE;
    }
};

// Search Local Recipes
const searchLocalRecipes = (ingredients) => {
    const keywords = ingredients.map((ing) => ing.toLowerCase());
    return localRecipes.filter((recipe) =>
        keywords.some((keyword) => recipe.name.includes(keyword))
    );
};

// Fetch Recommendations
router.post('/recommend', authenticateToken, async (req, res) => {
    const { ingredients } = req.body;
    const redisClient = req.app.locals.redis;
    const rabbitMqChannel = req.app.locals.rabbitMqChannel;

    if (!ingredients || ingredients.length === 0) {
        return res.status(400).json({ error: 'Ingredients are required for recommendations.' });
    }

    try {
        // Fetch Spoonacular API Results
        const spoonacularResponse = await axios.get(
            `https://api.spoonacular.com/recipes/findByIngredients`,
            {
                params: {
                    ingredients: ingredients.join(','),
                    number: 5,
                    apiKey: API_KEY,
                },
            }
        );

        // Map Spoonacular API Results
        const apiRecommendations = spoonacularResponse.data.map((recipe) => ({
            name: recipe.title,
            image: recipe.image || DEFAULT_IMAGE,
            id: recipe.id,
            source: 'spoonacular',
        }));

        // Fetch Local Recipes and their images
        const localRecommendations = await Promise.all(
            searchLocalRecipes(ingredients).map(async (recipe, index) => {
                const image = await fetchRecipeImage(recipe.name, redisClient, rabbitMqChannel);
                return {
                    name: recipe.name,
                    image: image,
                    id: `local-${index}`,
                    source: 'local',
                    instructions: recipe.instructions,
                };
            })
        );

        // Combine Results
        const combinedResults = [...localRecommendations, ...apiRecommendations];
        res.json(combinedResults);
    } catch (error) {
        console.error('Error fetching recommendations:', error.message || error.response?.data);
        res.status(500).json({ error: 'Failed to fetch recommendations.' });
    }
});

// Extract Ingredients from Instructions
const extractIngredientsFromInstructions = (instructions) => {
    const doc = nlp(instructions.toLowerCase());
    const nouns = doc.nouns().out('array');
    const irrelevantWords = ['tablespoon', 'cup', 'teaspoon', 'bowl', 'pan', 'mixture', 'oven', 'heat', 'minutes'];
    const ingredients = nouns.filter((word) => !irrelevantWords.includes(word));
    return [...new Set(ingredients)];
};

// Fetch Recipe Details
router.get('/recipe/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    if (id.startsWith('local-')) {
        const localId = parseInt(id.split('-')[1], 10);
        const recipe = localRecipes[localId];
        if (!recipe) {
            return res.status(404).json({ error: 'Local recipe not found.' });
        }

        const ingredients = extractIngredientsFromInstructions(recipe.instructions);
        res.json({
            ...recipe,
            ingredients: ingredients.length ? ingredients : ['No ingredients found in instructions.'],
        });
    } else {
        try {
            const response = await axios.get(
                `https://api.spoonacular.com/recipes/${id}/information`,
                { params: { apiKey: API_KEY } }
            );

            const ingredients = extractIngredientsFromInstructions(response.data.instructions);
            res.json({
                name: response.data.title,
                image: response.data.image || DEFAULT_IMAGE,
                instructions: response.data.instructions || 'No instructions provided.',
                ingredients: ingredients.length ? ingredients : ['No ingredients found in instructions.'],
            });
        } catch (error) {
            console.error('Error fetching recipe details:', error.message || error.response?.data);
            res.status(500).json({ error: 'Failed to fetch recipe details.' });
        }
    }
});

module.exports = router;
