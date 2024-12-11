import React, { useState, useEffect } from 'react'; 
import './App.css';
import Auth from './Auth';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token')); // Retrieve token from localStorage
    const [ingredient, setIngredient] = useState('');
    const [recipes, setRecipes] = useState([]);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const API_URL = process.env.REACT_APP_API_URL || 'http://104.154.238.75:5000';


    useEffect(() => {
        // Logic can be added here if needed when the token changes
    }, [token]);

    // Fetch Recommendations based on ingredients
    const fetchRecommendations = async () => {
        if (!ingredient.trim()) {
            setErrorMessage('Please enter at least one ingredient.');
            return;
        }

        setIsLoading(true); // Start loading indicator

        try {
            const response = await fetch(`${API_URL}/api/recommend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ingredients: ingredient.split(',') }),
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update image for local recipes if missing
                const updatedRecipes = data.map(recipe => ({
                    ...recipe,
                    image: recipe.image || `https://via.placeholder.com/150?text=${encodeURIComponent(recipe.name)}`,
                }));

                setRecipes(updatedRecipes);
                setErrorMessage('');
                setSelectedRecipe(null);
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.error || 'Failed to fetch recommendations.');
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            setErrorMessage('Failed to fetch recommendations.');
        } finally {
            setIsLoading(false); // Stop loading indicator
        }
    };

    const fetchRecipeDetails = async (id, source) => {
        if (!id || !source) {
            setErrorMessage('Invalid recipe selection. Please try again.');
            return;
        }

        setIsLoading(true); // Start loading indicator

        try {
            if (source === 'local') {
                const selectedRecipe = recipes.find((recipe) => recipe.id === id);
                if (!selectedRecipe) {
                    throw new Error('Recipe not found in local dataset.');
                }

                const ingredients = extractIngredientsFromInstructions(selectedRecipe.instructions);
                const image = selectedRecipe.image || `https://via.placeholder.com/150?text=${encodeURIComponent(selectedRecipe.name)}`;

                setSelectedRecipe({
                    ...selectedRecipe,
                    ingredients: ingredients.length ? ingredients : ['No ingredients found in instructions.'],
                    image: image,
                });
            } else {
                const response = await fetch(`${API_URL}/api/recipe/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const ingredients = extractIngredientsFromInstructions(data.instructions);

                    setSelectedRecipe({
                        ...data,
                        ingredients: ingredients.length ? ingredients : ['No ingredients found in instructions.'],
                    });
                    setErrorMessage('');
                } else {
                    const errorData = await response.json();
                    setErrorMessage(errorData.error || 'Failed to fetch recipe details.');
                }
            }
        } catch (error) {
            console.error('Error fetching recipe details:', error);
            setErrorMessage('Failed to fetch recipe details.');
        } finally {
            setIsLoading(false); // Stop loading indicator
        }
    };

    const extractIngredientsFromInstructions = (instructions) => {
        const ingredientKeywords = [
            'chicken', 'tomato', 'onion', 'garlic', 'carrot', 'potato', 'lettuce', 'spinach', 'pepper',
            'salt', 'butter', 'olive oil', 'sugar', 'flour', 'cheese', 'milk', 'egg', 'lemon', 'basil'
        ];

        const words = instructions.toLowerCase().split(/\s|,|\./).filter(Boolean);
        const foundIngredients = words.filter(word => ingredientKeywords.includes(word));

        return [...new Set(foundIngredients)]; // Remove duplicates and return the list
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken('');
    };

    return token ? (
        <div className="App">
            <header className="App-header">
                <h1>SmartMeal</h1>
                <button onClick={logout}>Logout</button>
                <input
                    type="text"
                    placeholder="Enter ingredient(s) (comma-separated)"
                    value={ingredient}
                    onChange={(e) => setIngredient(e.target.value)}
                />
                <button onClick={fetchRecommendations} disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Get Recommendations'}
                </button>
                {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
                {!selectedRecipe ? (
                    <ul>
                        {(recipes || []).map((recipe) => (
                            <li
                                key={recipe.id}
                                onClick={() => fetchRecipeDetails(recipe.id, recipe.source)}
                                style={{ cursor: 'pointer' }}
                            >
                                <h2>{recipe.name}</h2>
                                {recipe.image && <img src={recipe.image} alt={recipe.name} width="200" />}
                                <p><strong>Source:</strong> {recipe.source}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div>
                        <h2>{selectedRecipe.name}</h2>
                        {selectedRecipe.image && (
                            <img src={selectedRecipe.image} alt={selectedRecipe.name} width="300" />
                        )}
                        <div>
                            <strong>Instructions:</strong>
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: selectedRecipe.instructions || 'No instructions available.',
                                }}
                            ></div>
                        </div>
                        {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
                            <>
                                <p><strong>Ingredients:</strong></p>
                                <ul className="ingredients-list">
                                    {selectedRecipe.ingredients.map((ing, index) => (
                                        <li key={index}>{ing}</li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <p><strong>Ingredients:</strong> No ingredients found in instructions.</p>
                        )}
                        <button onClick={() => setSelectedRecipe(null)}>Back to Recommendations</button>
                    </div>
                )}
            </header>
        </div>
    ) : (
        <Auth setToken={setToken} />
    );
}

export default App;
