const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Debug: Log all environment variables
console.log('🔍 Environment variables:');
console.log('PORT:', process.env.PORT);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 'undefined');
console.log('OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + '...' : 'undefined');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/media', express.static('media'));

// Initialize OpenAI with error handling
let openai;
try {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is missing');
    }
    
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('✅ OpenAI client initialized successfully');
} catch (error) {
    console.error('❌ Error initializing OpenAI client:', error.message);
    console.log('📝 Please check your .env file contains: OPENAI_API_KEY=your_api_key_here');
    console.log('🔍 Current .env contents:', process.env.OPENAI_API_KEY ? 'API key found' : 'No API key found');
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// API endpoint for lyrics enhancement
app.post('/api/enhance-lyrics', async (req, res) => {
    try {
        // Check if OpenAI is available
        if (!openai) {
            return res.status(500).json({ 
                error: 'OpenAI service not available. Please check your API key configuration.',
                details: 'The OpenAI client failed to initialize. Check your .env file and restart the server.'
            });
        }

        const { lyrics } = req.body;
        
        if (!lyrics || lyrics.trim() === '') {
            return res.status(400).json({ error: 'Lyrics are required' });
        }

        const prompt = `Please add some alternatives to end the lines which have a <insert> in them. Here are the lyrics:

${lyrics}

Please provide the enhanced lyrics with alternatives for lines containing <insert> tags.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4", // Note: GPT-5 is not yet available, using GPT-4
            messages: [
                {
                    role: "system",
                    content: "You are a creative lyrics assistant. You help enhance lyrics by providing alternatives for lines that need completion."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7,
        });

        const enhancedLyrics = completion.choices[0].message.content;
        
        res.json({ 
            success: true, 
            enhancedLyrics,
            originalLyrics: lyrics 
        });

    } catch (error) {
        console.error('Error enhancing lyrics:', error);
        
        // Provide more specific error messages
        if (error.code === 'insufficient_quota') {
            res.status(500).json({ 
                error: 'OpenAI API quota exceeded. Please check your account balance.',
                details: error.message 
            });
        } else if (error.code === 'invalid_api_key') {
            res.status(500).json({ 
                error: 'Invalid OpenAI API key. Please check your .env file.',
                details: error.message 
            });
        } else if (error.code === 'rate_limit_exceeded') {
            res.status(500).json({ 
                error: 'Rate limit exceeded. Please wait a moment and try again.',
                details: error.message 
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to enhance lyrics',
                details: error.message 
            });
        }
    }
});

// API endpoint for finding matching images
app.post('/api/find-images', async (req, res) => {
    try {
        const { lyrics } = req.body;
        
        if (!lyrics || lyrics.trim() === '') {
            return res.status(400).json({ error: 'Lyrics are required' });
        }

        // Check if OpenAI is available
        if (!openai) {
            return res.status(500).json({ 
                error: 'OpenAI service not available. Please check your API key configuration.',
                details: 'The OpenAI client failed to initialize. Check your .env file and restart the server.'
            });
        }

        // Read all JSON files from the media folder
        const mediaFolder = path.join(__dirname, 'media');
        const files = fs.readdirSync(mediaFolder);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        if (jsonFiles.length === 0) {
            return res.status(404).json({ error: 'No media files found' });
        }

        // Read and parse all JSON files
        const mediaItems = [];
        for (const jsonFile of jsonFiles) {
            try {
                const jsonPath = path.join(mediaFolder, jsonFile);
                const jsonContent = fs.readFileSync(jsonPath, 'utf8');
                const mediaItem = JSON.parse(jsonContent);
                
                // Get the corresponding image file
                const imageFile = jsonFile.replace('.json', '.jpg');
                if (fs.existsSync(path.join(mediaFolder, imageFile))) {
                    mediaItems.push({
                        ...mediaItem,
                        imageFile: imageFile,
                        jsonFile: jsonFile
                    });
                }
            } catch (error) {
                console.error(`Error reading ${jsonFile}:`, error);
            }
        }

        if (mediaItems.length === 0) {
            return res.status(404).json({ error: 'No valid media items found' });
        }

        // First, use AI to analyze the lyrics and extract key themes
        const lyricsAnalysisPrompt = `Analyze these lyrics and extract the key visual themes, emotions, and subjects:

"${lyrics}"

Return a JSON object with these fields:
{
  "themes": ["array", "of", "main", "themes"],
  "emotions": ["array", "of", "emotional", "tones"],
  "subjects": ["array", "of", "main", "subjects"],
  "colors": ["array", "of", "color", "associations"],
  "atmosphere": "description of overall atmosphere"
}

Keep it concise and focused on visual elements.`;

        let lyricsAnalysis;
        try {
            const analysisCompletion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert at analyzing lyrics for visual themes and emotional content. Return only valid JSON."
                    },
                    {
                        role: "user",
                        content: lyricsAnalysisPrompt
                    }
                ],
                max_tokens: 300,
                temperature: 0.3,
            });

            const analysisResponse = analysisCompletion.choices[0].message.content.trim();
            lyricsAnalysis = JSON.parse(analysisResponse);
        } catch (error) {
            console.error('Error analyzing lyrics:', error);
            // Fallback to simple keyword extraction
            lyricsAnalysis = {
                themes: extractKeywords(lyrics),
                emotions: [],
                subjects: [],
                colors: [],
                atmosphere: ''
            };
        }

        // Now score each image based on the analyzed themes
        const scoredItems = mediaItems.map(item => {
            let score = 0;
            const description = item.description.toLowerCase();
            const tags = (item.tags || []).map(tag => tag.toLowerCase());
            const scoringDetails = [];
            
            // Score based on themes
            if (lyricsAnalysis.themes) {
                lyricsAnalysis.themes.forEach(theme => {
                    const themeLower = theme.toLowerCase();
                    if (description.includes(themeLower)) {
                        score += 5;
                        scoringDetails.push(`+5: Theme "${theme}" found in description`);
                    }
                    if (tags.some(tag => tag.includes(themeLower))) {
                        score += 3;
                        scoringDetails.push(`+3: Theme "${theme}" found in tags`);
                    }
                });
            }
            
            // Score based on emotions
            if (lyricsAnalysis.emotions) {
                lyricsAnalysis.emotions.forEach(emotion => {
                    const emotionLower = emotion.toLowerCase();
                    if (description.includes(emotionLower)) {
                        score += 4;
                        scoringDetails.push(`+4: Emotion "${emotion}" found in description`);
                    }
                    if (tags.some(tag => tag.includes(emotionLower))) {
                        score += 2;
                        scoringDetails.push(`+2: Emotion "${emotion}" found in tags`);
                    }
                });
            }
            
            // Score based on subjects
            if (lyricsAnalysis.subjects) {
                lyricsAnalysis.subjects.forEach(subject => {
                    const subjectLower = subject.toLowerCase();
                    if (description.includes(subjectLower)) {
                        score += 4;
                        scoringDetails.push(`+4: Subject "${subject}" found in description`);
                    }
                    if (tags.some(tag => tag.includes(subjectLower))) {
                        score += 2;
                        scoringDetails.push(`+2: Subject "${subject}" found in tags`);
                    }
                });
            }
            
            // Score based on colors
            if (lyricsAnalysis.colors) {
                lyricsAnalysis.colors.forEach(color => {
                    const colorLower = color.toLowerCase();
                    if (description.includes(colorLower)) {
                        score += 2;
                        scoringDetails.push(`+2: Color "${color}" found in description`);
                    }
                });
            }
            
            // Score based on atmosphere
            if (lyricsAnalysis.atmosphere) {
                const atmosphereLower = lyricsAnalysis.atmosphere.toLowerCase();
                if (description.includes(atmosphereLower)) {
                    score += 3;
                    scoringDetails.push(`+3: Atmosphere match found in description`);
                }
            }
            
            // Additional scoring for common patterns
            const lyricsLower = lyrics.toLowerCase();
            
            // Space/astronomical themes
            if ((description.includes('space') || description.includes('astronaut') || description.includes('planet')) && 
                (lyricsLower.includes('star') || lyricsLower.includes('space') || lyricsLower.includes('moon'))) {
                score += 8;
                scoringDetails.push(`+8: Strong space theme match`);
            }
            
            // Nature/landscape themes
            if ((description.includes('mountain') || description.includes('ocean') || description.includes('forest')) && 
                (lyricsLower.includes('mountain') || lyricsLower.includes('sea') || lyricsLower.includes('nature'))) {
                score += 8;
                scoringDetails.push(`+8: Strong nature theme match`);
            }
            
            // Urban/city themes
            if ((description.includes('city') || description.includes('street') || description.includes('urban')) && 
                (lyricsLower.includes('city') || lyricsLower.includes('street') || lyricsLower.includes('urban'))) {
                score += 8;
                scoringDetails.push(`+8: Strong urban theme match`);
            }
            
            // Night/dark themes
            if ((description.includes('night') || description.includes('dark') || description.includes('moonlight')) && 
                (lyricsLower.includes('night') || lyricsLower.includes('dark') || lyricsLower.includes('moon'))) {
                score += 6;
                scoringDetails.push(`+6: Night/dark theme match`);
            }
            
            // Light/bright themes
            if ((description.includes('sun') || description.includes('light') || description.includes('bright')) && 
                (lyricsLower.includes('sun') || lyricsLower.includes('light') || lyricsLower.includes('bright'))) {
                score += 6;
                scoringDetails.push(`+6: Light/bright theme match`);
            }
            
            return { ...item, score, scoringDetails };
        });
        
        // Sort by score and take top 10
        scoredItems.sort((a, b) => b.score - a.score);
        const matchedImages = scoredItems.slice(0, 10).map((item, index) => ({
            filename: item.imageFile,
            description: item.description,
            tags: item.tags || [],
            relevance: index === 0 ? 'Most Relevant' : `Rank ${index + 1}`,
            score: item.score,
            scoringDetails: item.scoringDetails,
            rank: index + 1
        }));

        res.json({ 
            success: true, 
            matchedImages,
            totalImages: mediaItems.length,
            analysis: lyricsAnalysis
        });

    } catch (error) {
        console.error('Error finding images:', error);
        res.status(500).json({ 
            error: 'Failed to find matching images',
            details: error.message 
        });
    }
});

// Helper function to extract keywords from lyrics
function extractKeywords(lyrics) {
    const commonThemes = [
        'space', 'star', 'moon', 'sun', 'light', 'dark', 'night',
        'mountain', 'ocean', 'sea', 'river', 'forest', 'nature',
        'city', 'street', 'urban', 'building', 'road',
        'love', 'heart', 'soul', 'spirit', 'dream', 'hope',
        'fire', 'water', 'earth', 'wind', 'sky', 'cloud'
    ];
    
    const lyricsLower = lyrics.toLowerCase();
    return commonThemes.filter(theme => lyricsLower.includes(theme));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        openai: openai ? 'initialized' : 'not available',
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📊 Health check available at http://localhost:${port}/health`);
    
    if (!openai) {
        console.log('⚠️  Warning: OpenAI client not available. Check your .env file.');
    }
}); 