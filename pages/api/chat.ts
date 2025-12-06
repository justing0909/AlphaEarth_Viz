import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

// ============================================
// CONSTANTS & TYPES
// ============================================

const VALID_CLASSES = [
  'Water', 'Tree cover', 'Mangroves', 'Shrubland', 'Cropland',
  'Built-up', 'Bare/sparse', 'Snow/ice', 'Grassland', 'Wetland',
  'Herb. wetland', 'Moss/lichen', 'All other classes'
]

const CLASS_CODE_MAP: Record<string, number> = {
  'Tree cover': 10, 'Shrubland': 20, 'Grassland': 30, 'Cropland': 40,
  'Built-up': 50, 'Bare/sparse': 60, 'Snow/ice': 70, 'Water': 80,
  'Herb. wetland': 90, 'Mangroves': 95, 'Moss/lichen': 100,
  'Wetland': 90, 'All other classes': 999
}

const ALGORITHM_OPTIONS = [
  { value: 'rf', name: 'Random Forest', description: 'Good default, fast, interpretable' },
  { value: 'gbt', name: 'Gradient Boosting', description: 'Often higher accuracy, slower' },
  { value: 'xgb', name: 'XGBoost', description: 'High performance, good for complex patterns' },
  { value: 'lgb', name: 'LightGBM', description: 'Fast training, memory efficient' }
]

const DEFAULT_PARAMS = {
  algorithm: 'rf',
  testSize: 25,
  samplesPerClass: 100,
  scale: 500,
  seed: 42
}

type ConversationState = {
  class1?: string
  class2?: string
  location?: string
  algorithm?: string
  testSize?: number
  samplesPerClass?: number
  scale?: number
  seed?: number
  bbox?: [number, number, number, number]
}

type IntentType = 'confirm' | 'reject' | 'question' | 'classification_request' | 'modify_params' | 'greeting' | 'unclear'

// ============================================
// KNOWLEDGE BASE FOR Q&A
// ============================================

const KNOWLEDGE_BASE = `
# AlphaEarth Knowledge Base

## What is AlphaEarth?
AlphaEarth (also called Google AlphaEarth Foundations) is a satellite embedding dataset released by Google DeepMind. It contains annual satellite embeddings from 2017-2024, where each pixel represents a 10x10 meter area. The dataset is available on Google Earth Engine and can be used to train machine learning models to classify satellite imagery.

## What are the 64 embeddings?
The AlphaEarth model produces 64 embedding dimensions (A01-A64) for each pixel. These embeddings capture spectral and spatial patterns from satellite imagery. Not all 64 embeddings are equally important for every classification task - different land cover comparisons rely on different subsets of embeddings.

## ESA WorldCover Classes
The app uses ESA WorldCover v100 (2020) labels:
- 10: Tree cover (forests, woodlands)
- 20: Shrubland (bushes, scrub)
- 30: Grassland (natural grass, pastures)
- 40: Cropland (agricultural areas)
- 50: Built-up (urban, buildings, roads)
- 60: Bare/sparse vegetation (rock, sand, sparse plants)
- 70: Snow and ice
- 80: Water (permanent water bodies, lakes, rivers)
- 90: Herbaceous wetland (marshes, swamps)
- 95: Mangroves
- 100: Moss and lichen
- 999: All other classes (combines all classes except selected one)

## Key Research Insights
1. Not all 64 embeddings are needed for accurate classification. The number required depends on the land's spectral signature.
2. Coastal areas and higher population regions tend to have higher accuracy because of stark contrasts (water vs land).
3. Some embeddings are "exclusive" to specific land cover classes while others are shared across multiple classes.
4. The research has analyzed 130k+ independent experiments to understand embedding importance.

## Algorithm Options
- Random Forest (rf): Good default choice, fast, interpretable feature importances
- Gradient Boosting (gbt): Often higher accuracy but slower
- XGBoost (xgb): High performance for complex patterns
- LightGBM (lgb): Fast training, memory efficient

## Parameters Explained
- Test Size (10-40%): Percentage of data held out for testing. Default 25%.
- Samples per class (50-300): How many sample points to collect per land cover class. Default 100.
- Scale (100-2000m): Spatial resolution for sampling. Default 500m. Smaller = more precise but slower.
- Seed: Random seed for reproducibility. Default 42.

## Classification Difficulty
Easy comparisons: Water vs Built-up, Snow vs Water (very different spectral signatures)
Medium comparisons: Cropland vs Grassland, Tree cover vs Shrubland
Hard comparisons: Mangroves vs Herbaceous wetland, Shrubland vs Grassland (similar spectral signatures)

## How to Use the Jupyter Notebook
1. Select your country from the dropdown
2. Draw a rectangle on the map to select your Region of Interest (ROI)
3. Choose two land cover classes to compare
4. Adjust algorithm settings if desired
5. Click "RUN ANALYSIS"
6. Review results: accuracy, ROC AUC, confusion matrix, and embedding importance chart
7. Optionally download embedding rasters
`

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapClassToCode(className: string): number {
  return CLASS_CODE_MAP[className] || 10
}

async function geocodeLocation(location: string): Promise<[number, number, number, number] | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'AlphaEarth-Dashboard/1.0' } }
    )
    const data = await response.json()
    if (data.length === 0) return null
    const [south, north, west, east] = data[0].boundingbox.map(Number)
    return [west, south, east, north]
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// Load statistics for answering data questions
function loadStatistics() {
  try {
    const statsPath = path.join(process.cwd(), 'data', 'statistics.json')
    if (fs.existsSync(statsPath)) {
      return JSON.parse(fs.readFileSync(statsPath, 'utf8'))
    }
  } catch (e) {
    console.error('Failed to load statistics:', e)
  }
  return null
}

// ============================================
// LLM INTERACTION FUNCTIONS
// ============================================

async function classifyIntent(message: string, hasPendingComparison: boolean): Promise<IntentType> {
  const prompt = `Classify the user's intent. Context: ${hasPendingComparison ? 'There is a pending classification request awaiting confirmation.' : 'No pending request.'}

User message: "${message}"

Classify as ONE of:
- "confirm": User is confirming/agreeing (yes, yeah, yep, correct, sure, ok, sounds good, that's right, si, oui, ja, etc.)
- "reject": User is rejecting/disagreeing (no, wrong, incorrect, nope, not quite, change that, etc.)
- "question": User is asking a question about AlphaEarth, embeddings, land cover, how something works, etc.
- "classification_request": User wants to compare land cover classes in a location
- "modify_params": User wants to change algorithm settings (test size, samples, scale, algorithm type)
- "greeting": Simple greeting (hi, hello, hey, etc.)
- "unclear": Cannot determine intent

Respond with ONLY the classification word, nothing else.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 20
      })
    })
    const data = await response.json()
    const intent = data.choices[0].message.content.trim().toLowerCase()
    if (['confirm', 'reject', 'question', 'classification_request', 'modify_params', 'greeting', 'unclear'].includes(intent)) {
      return intent as IntentType
    }
  } catch (e) {
    console.error('Intent classification error:', e)
  }
  return 'unclear'
}

async function extractClassificationParams(message: string, lastConfirmed?: ConversationState | null): Promise<Partial<ConversationState>> {
  const contextSection = lastConfirmed?.location
    ? `\nPrevious context - Location: "${lastConfirmed.location}", Classes: ${lastConfirmed.class1 || 'none'} vs ${lastConfirmed.class2 || 'none'}
If user says "here", "there", "same place" use: "${lastConfirmed.location}"
If user says "same classes" use: "${lastConfirmed.class1}" and "${lastConfirmed.class2}"`
    : ''

  const prompt = `Extract land cover classification parameters from this request.

VALID CLASSES: ${VALID_CLASSES.join(', ')}

MAPPING RULES:
- water/ocean/sea/lake/river → Water
- trees/forest/woodland → Tree cover
- mangrove/mangroves → Mangroves
- shrubs/bushes/scrub → Shrubland
- crops/cropland/agriculture/farm → Cropland
- urban/city/buildings/developed → Built-up
- bare/barren/desert/rock → Bare/sparse
- snow/ice/glacier → Snow/ice
- grass/grassland/pasture → Grassland
- wetland/marsh/swamp → Wetland
- all others/everything else → All other classes
${contextSection}

User message: "${message}"

Extract and respond with ONLY valid JSON:
{
  "class1": "exact class name or null",
  "class2": "exact class name or null", 
  "location": "location name or null",
  "algorithm": "rf/gbt/xgb/lgb or null",
  "testSize": number 10-40 or null,
  "samplesPerClass": number 50-300 or null,
  "scale": number 100-2000 or null
}`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Extract structured data. Respond with valid JSON only, no markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    })
    const data = await response.json()
    let content = data.choices[0].message.content.trim()
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(content)
  } catch (e) {
    console.error('Extraction error:', e)
    return {}
  }
}

async function answerQuestion(question: string, stats: any): Promise<string> {
  // Build context from statistics if available
  let statsContext = ''
  if (stats) {
    statsContext = `\n\nAvailable Statistics Summary:
- Total experiments: ${stats.summary?.total_models || 'N/A'}
- Countries analyzed: ${stats.summary?.total_countries || 'N/A'}
- Unique class pairs tested: ${stats.summary?.total_class_pairs || 'N/A'}
- Experiments with geographic data: ${stats.summary?.experiments_with_bounding_boxes || 'N/A'}`
  }

  const prompt = `You are an expert assistant for the AlphaEarth Land Cover Classification app. Answer the user's question based on this knowledge:

${KNOWLEDGE_BASE}
${statsContext}

User question: "${question}"

Provide a helpful, concise answer. If the question is about specific statistics or data you don't have, say you can help them explore that in the app's visualization pages.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    })
    const data = await response.json()
    return data.choices[0].message.content.trim()
  } catch (e) {
    console.error('Q&A error:', e)
    return "I'm having trouble answering that right now. Could you try rephrasing your question?"
  }
}

function generateNotebookInstructions(state: ConversationState): string {
  const algo = ALGORITHM_OPTIONS.find(a => a.value === (state.algorithm || 'rf'))
  
  return `Great! Here's everything you need for the Jupyter notebook:

📍 **Region of Interest (ROI):**
Draw a rectangle on the map with these coordinates:
- Min Longitude: ${state.bbox![0].toFixed(4)}
- Min Latitude: ${state.bbox![1].toFixed(4)}
- Max Longitude: ${state.bbox![2].toFixed(4)}
- Max Latitude: ${state.bbox![3].toFixed(4)}

🌍 **Land Cover Classes:**
- Class A: ${state.class1} (Code: ${mapClassToCode(state.class1!)})
- Class B: ${state.class2} (Code: ${mapClassToCode(state.class2!)})

⚙️ **Algorithm Settings:**
- Algorithm: ${algo?.name || 'Random Forest'} (\`${state.algorithm || 'rf'}\`)
- Test Data: ${state.testSize || DEFAULT_PARAMS.testSize}%
- Samples per class: ${state.samplesPerClass || DEFAULT_PARAMS.samplesPerClass}
- Scale: ${state.scale || DEFAULT_PARAMS.scale}m
- Seed: ${state.seed || DEFAULT_PARAMS.seed}

Click "RUN ANALYSIS" in the notebook after entering these values!

💡 **Tip:** ${algo?.description || 'Random Forest is a good default choice.'}`
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', hasGroqKey: !!process.env.GROQ_API_KEY })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, pendingComparison, lastConfirmedComparison } = req.body
    const stats = loadStatistics()
    const hasPending = pendingComparison && !pendingComparison.bbox

    // Classify user intent
    const intent = await classifyIntent(message, hasPending)
    console.log('Classified intent:', intent)

    // Handle based on intent
    switch (intent) {
      case 'greeting':
        return res.status(200).json({
          message: "Hello! I'm your AlphaEarth assistant. I can help you:\n\n• Set up land cover classifications (e.g., \"Compare water vs forest in California\")\n• Answer questions about AlphaEarth embeddings and the research\n• Explain how to use the Jupyter notebook\n\nWhat would you like to do?",
          pendingComparison: null
        })

      case 'question':
        const answer = await answerQuestion(message, stats)
        return res.status(200).json({ message: answer, pendingComparison })

      case 'confirm':
        if (!hasPending) {
          return res.status(200).json({
            message: "I don't have a pending request to confirm. Would you like to start a new land cover classification? Just tell me two land cover types and a location!",
            pendingComparison: null
          })
        }
        
        const bbox = await geocodeLocation(pendingComparison.location)
        if (bbox) {
          const confirmedState: ConversationState = {
            ...pendingComparison,
            bbox,
            algorithm: pendingComparison.algorithm || DEFAULT_PARAMS.algorithm,
            testSize: pendingComparison.testSize || DEFAULT_PARAMS.testSize,
            samplesPerClass: pendingComparison.samplesPerClass || DEFAULT_PARAMS.samplesPerClass,
            scale: pendingComparison.scale || DEFAULT_PARAMS.scale,
            seed: pendingComparison.seed || DEFAULT_PARAMS.seed
          }
          
          return res.status(200).json({
            message: generateNotebookInstructions(confirmedState),
            confirmed: true,
            pendingComparison: confirmedState,
            bbox,
            analysisParams: {
              classACode: mapClassToCode(confirmedState.class1!),
              classBCode: mapClassToCode(confirmedState.class2!),
              bbox,
              location: confirmedState.location,
              algorithm: confirmedState.algorithm,
              testSize: confirmedState.testSize,
              samplesPerClass: confirmedState.samplesPerClass,
              scale: confirmedState.scale,
              seed: confirmedState.seed
            },
            showNotebookButton: true
          })
        } else {
          return res.status(200).json({
            message: `I couldn't find precise coordinates for "${pendingComparison.location}". Could you try a more specific location? For example, a city name, state, or country.`,
            pendingComparison: null
          })
        }

      case 'reject':
        return res.status(200).json({
          message: "No problem! What would you like to change? You can:\n• Specify different land cover classes\n• Change the location\n• Adjust algorithm settings (algorithm, test size, samples, scale)\n\nJust let me know!",
          pendingComparison: null
        })

      case 'modify_params':
      case 'classification_request':
        const extracted = await extractClassificationParams(message, lastConfirmedComparison)
        
        // Merge with pending comparison if exists
        const merged: Partial<ConversationState> = {
          ...(pendingComparison || {}),
          ...Object.fromEntries(Object.entries(extracted).filter(([_, v]) => v != null))
        }

        // Check what we have
        const hasClasses = merged.class1 && merged.class2
        const hasLocation = merged.location

        if (hasClasses && hasLocation) {
          // Format confirmation message with any custom params
          let confirmMsg = `I'll set up **${merged.class1}** vs **${merged.class2}** in **${merged.location}**`
          
          const customParams: string[] = []
          if (merged.algorithm && merged.algorithm !== 'rf') {
            const algo = ALGORITHM_OPTIONS.find(a => a.value === merged.algorithm)
            customParams.push(`${algo?.name || merged.algorithm}`)
          }
          if (merged.testSize && merged.testSize !== 25) customParams.push(`${merged.testSize}% test data`)
          if (merged.samplesPerClass && merged.samplesPerClass !== 100) customParams.push(`${merged.samplesPerClass} samples/class`)
          if (merged.scale && merged.scale !== 500) customParams.push(`${merged.scale}m scale`)
          
          if (customParams.length > 0) {
            confirmMsg += ` using ${customParams.join(', ')}`
          }
          confirmMsg += '.\n\nIs this correct?'

          return res.status(200).json({
            message: confirmMsg,
            pendingComparison: merged
          })
        }

        // Ask for missing info
        const missing: string[] = []
        if (!merged.class1) missing.push('first land cover class')
        if (!merged.class2) missing.push('second land cover class')
        if (!hasLocation) missing.push('location')

        let helpMsg = `I need a bit more information. Please specify: ${missing.join(', ')}.`
        
        if (!hasClasses) {
          helpMsg += `\n\n**Available classes:** ${VALID_CLASSES.slice(0, -1).join(', ')}`
        }

        return res.status(200).json({
          message: helpMsg,
          pendingComparison: Object.keys(merged).length > 0 ? merged : null
        })

      case 'unclear':
      default:
        return res.status(200).json({
          message: "I'm not sure what you'd like to do. I can help you:\n\n• **Compare land cover classes** - e.g., \"Compare cropland vs forest in Iowa\"\n• **Answer questions** - e.g., \"What are the 64 embeddings?\"\n• **Explain parameters** - e.g., \"What algorithm should I use?\"\n\nWhat would you like help with?",
          pendingComparison
        })
    }

  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Sorry, something went wrong. Please try again.'
    })
  }
}