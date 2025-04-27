const { processQuery, extractKeywords, analyzeQuery } = require('./advisor');

const exampleQueries = [
  "What should I upgrade first at TH10?",
  "Which troops should I prioritize upgrading for TH9 war attacks?",
  
  "What's a good dragon attack strategy for TH11?",
  "Best farming strategy for TH8 to get dark elixir?",
  
  "How should I design my TH9 war base to defend against hog riders?",
  "What's a good trophy pushing base layout for TH10?",
  
  "What's the fastest way to get dark elixir at TH8?",
  "How should I spend my resources efficiently at TH7?"
];

/**
 * Test different components of the advisor
 */
async function testAdvisorComponents() {
  console.log("Testing Advisor Components\n");
  
  console.log("1. Testing Keyword Extraction\n");
  const testQueries = [
    "What should I upgrade first at TH10?",
    "How do I defend against dragon attacks in war?",
    "Best farming strategy with goblins for a TH8?"
  ];
  
  for (const query of testQueries) {
    const keywords = extractKeywords(query);
    console.log(`Query: "${query}"`);
    console.log(`Keywords: ${keywords.join(', ')}`);
    console.log();
  }
  
  // Test query analysis
  console.log("2. Testing Query Analysis\n");
  const analysisQueries = [
    "What should I upgrade first at TH9?",
    "How do I use dragons effectively in war attacks?",
    "What's the best base layout for TH10 farming?",
    "Fastest way to get dark elixir at TH8?"
  ];
  
  for (const query of analysisQueries) {
    const analysis = analyzeQuery(query);
    console.log(`Query: "${query}"`);
    console.log(`Intent: ${analysis.intent}`);
    console.log(`Parameters: ${JSON.stringify(analysis.params, null, 2)}`);
    console.log();
  }
}

/**
 * Run the example queries to test the advisor
 */
async function runExampleQueries() {
  try {
    console.log("\nStarting Strategy Advisor Example Queries...\n");
    
    const queriesToTest = exampleQueries.slice(0, 4);
    
    for (const query of queriesToTest) {
      console.log(`Query: "${query}"`);
      
      const startTime = Date.now();
      
      const result = await processQuery(query);
      
      const responseTime = Date.now() - startTime;
      
      console.log(`\nDetected Intent: ${result.intent}`);
      console.log(`Parameters: ${JSON.stringify(result.parameters, null, 2)}`);
      
      console.log(`\nSources used (with relevance):`);
      result.sources.forEach((source, index) => {
        console.log(`${index + 1}. ${source.name} (${source.type}) - Relevance: ${source.relevance}%`);
      });
      
      console.log(`\nMetadata:`);
      console.log(`- Keywords: ${result.metadata.queryKeywords.join(', ')}`);
      console.log(`- Context Count: ${result.metadata.contextCount}`);
      console.log(`- Response Time: ${responseTime}ms`);
      
      console.log(`\nResponse:`);
      console.log(result.response);
      
      console.log("\n-----------------------------------\n");
    }
    
  } catch (error) {
    console.error("Error running example queries:", error.message);
  }
}

// Run both component tests and example queries if this script is executed directly
async function main() {
  await testAdvisorComponents();
  
  await runExampleQueries();
}

if (require.main === module) {
  main();
}

module.exports = { testAdvisorComponents, runExampleQueries, exampleQueries };