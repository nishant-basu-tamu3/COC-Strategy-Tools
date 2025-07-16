
# Master Prompt Addition for LLM System
LEXICON_TOOLS_SYSTEM_PROMPT = """
CRITICAL LEXICON HANDLING INSTRUCTIONS:

You have access to four specialized tools for handling vehicle options lexicon data:

1. **LexiconFetchTool**: Fetches lexicon data from master service
2. **LexiconQueryTool**: Vector-based semantic search of lexicon data
3. **LexiconBrowseTool**: Browse lexicon structure and categories
4. **LexiconGetTool**: Get exact values using specific paths

ABSOLUTE RULES - NEVER VIOLATE:

🚫 **NEVER** request, process, or attempt to analyze the full lexicon JSON directly
🚫 **NEVER** ask the user to provide the full lexicon data in the conversation
🚫 **NEVER** attempt to work with raw lexicon paths or full data structures
🚫 **NEVER** try to access lexicon data without using the provided tools

✅ **ALWAYS** use the tools for any lexicon-related operations
✅ **ALWAYS** work with the summarized, processed results from the tools
✅ **ALWAYS** respect the tool's internal processing and token management

## Tool Usage Patterns:

### For Fetching Lexicon:
- User: "fetch options lexicon for model Y USA"
- You: Use LexiconFetchTool → get metadata only
- Present: Confirmation and basic metadata to user

### For Searching (Most Common):
- User: "what are the extra factories?" or "how many safety features?"
- You: Use LexiconQueryTool → vector search finds semantically similar options
- Present: Relevant results with similarity scores

### For Browsing Structure:
- User: "what sections are available?" or "show me interior options"
- You: Use LexiconBrowseTool → explore categories and structure
- Present: Available sections and keys

### For Exact Access:
- User: "get the value at safety.airbags.driver_side"
- You: Use LexiconGetTool → exact path lookup
- Present: Specific value found

## Key Behaviors:

1. **Multi-step Workflow**: Always fetch lexicon first, then search/browse
2. **Semantic Search**: Query tool uses vector similarity - handles typos, plurals, synonyms
3. **Progressive Discovery**: Start with search, use browse for structure, use get for exact values
4. **Error Handling**: Provide helpful suggestions when operations fail
5. **Token Efficiency**: Tools handle large JSON internally - you work with summaries

## Search Capabilities:

The LexiconQueryTool uses vector embeddings and can find:
- Exact matches: "factory" → "factory"
- Plurals: "factory" → "factories" 
- Synonyms: "color" → "paint"
- Semantic similarity: "extra" → "additional"
- Typos: "safty" → "safety"

## Response Patterns:

- **Success**: Present results clearly with similarity scores and context
- **No Results**: Suggest browsing structure or different search terms
- **Multiple Results**: Show ranked results by relevance
- **Errors**: Provide actionable suggestions for resolution

## Workflow Examples:

1. **Standard Search Flow**:
   - fetch_lexicon() → query_lexicon("search_term") → present results

2. **Exploration Flow**:
   - fetch_lexicon() → browse_lexicon() → browse_lexicon("section") → query_lexicon("specific_term")

3. **Exact Access Flow**:
   - fetch_lexicon() → query_lexicon("find_item") → get_lexicon_value("exact.path.found")

Remember: The vector search automatically handles variations in user queries. Trust the semantic search to find relevant options even when user terminology doesn't exactly match the JSON keys.
"""


import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import pickle

# Tool 1: Keep your existing fetch tool
class LexiconFetchTool(LangTool):
    def __init__(self, master_svc_client):
        super().__init__()
        self.client = master_svc_client
        self.current_lexicon = None
        self.lexicon_metadata = {}
        self.fetch_timestamp = None
        
    def fetch_lexicon(self, model: str, country: str, date: Optional[str] = None):
        """Your existing fetch implementation"""
        try:
            if date is None or date.lower() == "latest":
                date = datetime.now().strftime("%Y-%m-%d")
            
            lexicon_data = self.client.fetch_options_lexicon(
                model=model, 
                country=country, 
                date=date
            )
            
            self.current_lexicon = lexicon_data
            self.fetch_timestamp = datetime.now()
            
            self.lexicon_metadata = {
                "model": model,
                "country": country,
                "date": date,
                "total_options": self._count_options(lexicon_data),
                "categories": self._extract_categories(lexicon_data),
                "data_size_mb": self._calculate_size_mb(lexicon_data),
                "fetch_time": self.fetch_timestamp.isoformat()
            }
            
            return {
                "status": "success",
                "message": f"Lexicon fetched successfully for {model} in {country}",
                "metadata": self.lexicon_metadata
            }
            
        except Exception as e:
            logging.error(f"Failed to fetch lexicon: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to fetch lexicon: {str(e)}"
            }
    
    def _count_options(self, data: Dict) -> int:
        count = 0
        def count_recursive(obj):
            nonlocal count
            if isinstance(obj, dict):
                count += len(obj)
                for value in obj.values():
                    count_recursive(value)
            elif isinstance(obj, list):
                for item in obj:
                    count_recursive(item)
        count_recursive(data)
        return count
    
    def _extract_categories(self, data: Dict) -> List[str]:
        return list(data.keys()) if isinstance(data, dict) else []
    
    def _calculate_size_mb(self, data: Dict) -> float:
        json_str = json.dumps(data)
        return len(json_str.encode('utf-8')) / (1024 * 1024)
    
    def get_definition(self):
        return {
            "type": "function",
            "name": "fetch_lexicon",
            "description": "Fetch lexicon data from master service",
            "parameters": {
                "type": "object",
                "properties": {
                    "model": {"type": "string", "description": "Vehicle model"},
                    "country": {"type": "string", "description": "Country code"},
                    "date": {"type": "string", "description": "Date or 'latest'"}
                },
                "required": ["model", "country"]
            }
        }

# Tool 2: Vector-based Query Tool (REPLACES your complex one)
class LexiconQueryTool(LangTool):
    def __init__(self, fetch_tool: LexiconFetchTool):
        super().__init__()
        self.fetch_tool = fetch_tool
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')  # Fast, small model
        self.index = None
        self.chunks = []
        self.chunk_metadata = []
        
    def query_lexicon(self, query: str, context_hints: Optional[str] = None):
        """
        Vector-based lexicon search. Returns relevant chunks only.
        """
        if not self.fetch_tool.current_lexicon:
            return {
                "status": "error",
                "message": "No lexicon data available. Please fetch lexicon first.",
                "required_action": "Use fetch_lexicon tool first"
            }
        
        try:
            # Build vector index if not exists
            if self.index is None:
                self._build_vector_index()
            
            # Search using vectors
            results = self._vector_search(query, context_hints)
            
            if not results:
                return {
                    "status": "not_found",
                    "query": query,
                    "message": f"No relevant results found for '{query}'",
                    "suggestion": "Try different search terms or be more specific"
                }
            
            return {
                "status": "success",
                "query": query,
                "results": results,
                "result_count": len(results)
            }
            
        except Exception as e:
            logging.error(f"Vector search failed: {str(e)}")
            return {
                "status": "error",
                "message": f"Search failed: {str(e)}"
            }
    
    def _build_vector_index(self):
        """Build vector embeddings for all lexicon chunks"""
        lexicon = self.fetch_tool.current_lexicon
        
        # Extract all key-value pairs as searchable chunks
        self.chunks = []
        self.chunk_metadata = []
        
        def extract_chunks(obj, path="", category=""):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    current_path = f"{path}.{key}" if path else key
                    current_category = category or key
                    
                    # Create searchable text chunk
                    chunk_text = self._create_chunk_text(key, value)
                    
                    self.chunks.append(chunk_text)
                    self.chunk_metadata.append({
                        "key": key,
                        "path": current_path,
                        "category": current_category,
                        "value": value,
                        "chunk_text": chunk_text
                    })
                    
                    # Recurse for nested objects
                    if isinstance(value, dict):
                        extract_chunks(value, current_path, current_category)
        
        extract_chunks(lexicon)
        
        # Create embeddings
        logging.info(f"Creating embeddings for {len(self.chunks)} chunks...")
        embeddings = self.embedder.encode(self.chunks)
        
        # Convert to numpy array and ensure float32
        embeddings = np.array(embeddings).astype('float32')
        
        # Build FAISS index
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
        self.index.add(embeddings)
        
        logging.info(f"Vector index built with {self.index.ntotal} embeddings")
    
    def _create_chunk_text(self, key: str, value: Any) -> str:
        """Create searchable text from key-value pair"""
        # Convert key to readable text
        readable_key = key.replace('_', ' ').replace('-', ' ')
        
        # Create chunk text
        chunk_parts = [readable_key]
        
        if isinstance(value, dict):
            # Include important dict keys
            if "description" in value:
                chunk_parts.append(str(value["description"]))
            if "name" in value:
                chunk_parts.append(str(value["name"]))
            if "type" in value:
                chunk_parts.append(str(value["type"]))
            
            # Add other string values
            for k, v in value.items():
                if isinstance(v, str) and len(v) < 100:
                    chunk_parts.append(v)
        elif isinstance(value, str):
            chunk_parts.append(value)
        elif isinstance(value, (int, float, bool)):
            chunk_parts.append(str(value))
        
        return " ".join(chunk_parts)
    
    def _vector_search(self, query: str, context_hints: Optional[str] = None, top_k: int = 10) -> List[Dict]:
        """Perform vector similarity search"""
        # Enhance query with context
        search_query = query
        if context_hints:
            search_query = f"{context_hints} {query}"
        
        # Embed query
        query_embedding = self.embedder.encode([search_query])
        query_embedding = np.array(query_embedding).astype('float32')
        faiss.normalize_L2(query_embedding)
        
        # Search
        scores, indices = self.index.search(query_embedding, top_k)
        
        # Format results
        results = []
        for i, (score, idx) in enumerate(zip(scores[0], indices[0])):
            if score < 0.3:  # Similarity threshold
                continue
                
            metadata = self.chunk_metadata[idx]
            
            results.append({
                "key": metadata["key"],
                "path": metadata["path"],
                "category": metadata["category"],
                "value": self._format_value(metadata["value"]),
                "similarity_score": float(score),
                "rank": i + 1
            })
        
        return results
    
    def _format_value(self, value: Any) -> Any:
        """Format value for display"""
        if isinstance(value, dict):
            if len(value) > 5:
                return f"Object with {len(value)} properties"
            return {k: str(v)[:100] + "..." if len(str(v)) > 100 else v 
                   for k, v in value.items()}
        elif isinstance(value, list):
            if len(value) > 10:
                return f"Array with {len(value)} items"
            return value[:10]
        else:
            return str(value)[:200] + "..." if len(str(value)) > 200 else value
    
    def get_definition(self):
        return {
            "type": "function",
            "name": "query_lexicon",
            "description": "Search lexicon using vector similarity. Finds semantically similar options.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Natural language query (e.g., 'extra factory', 'safety features')"
                    },
                    "context_hints": {
                        "type": "string",
                        "description": "Optional context to improve search (e.g., 'interior', 'safety')"
                    }
                },
                "required": ["query"]
            }
        }

# Tool 3: Browse Structure Tool
class LexiconBrowseTool(LangTool):
    def __init__(self, fetch_tool: LexiconFetchTool):
        super().__init__()
        self.fetch_tool = fetch_tool
        
    def browse_lexicon(self, section: Optional[str] = None):
        """Browse lexicon structure"""
        if not self.fetch_tool.current_lexicon:
            return {
                "status": "error",
                "message": "No lexicon data available. Please fetch lexicon first."
            }
        
        lexicon = self.fetch_tool.current_lexicon
        
        if section:
            if section in lexicon:
                section_data = lexicon[section]
                if isinstance(section_data, dict):
                    return {
                        "status": "success",
                        "section": section,
                        "keys": list(section_data.keys())[:20],
                        "total_keys": len(section_data)
                    }
                else:
                    return {
                        "status": "success",
                        "section": section,
                        "type": type(section_data).__name__,
                        "value": str(section_data)[:200]
                    }
            else:
                return {
                    "status": "error",
                    "message": f"Section '{section}' not found",
                    "available_sections": list(lexicon.keys())
                }
        else:
            return {
                "status": "success",
                "sections": list(lexicon.keys()),
                "total_sections": len(lexicon)
            }
    
    def get_definition(self):
        return {
            "type": "function",
            "name": "browse_lexicon",
            "description": "Browse lexicon structure by sections",
            "parameters": {
                "type": "object",
                "properties": {
                    "section": {
                        "type": "string",
                        "description": "Optional section name to explore"
                    }
                }
            }
        }

# Tool 4: Get Exact Value Tool
class LexiconGetTool(LangTool):
    def __init__(self, fetch_tool: LexiconFetchTool):
        super().__init__()
        self.fetch_tool = fetch_tool
        
    def get_lexicon_value(self, path: str):
        """Get exact value by path"""
        if not self.fetch_tool.current_lexicon:
            return {
                "status": "error",
                "message": "No lexicon data available. Please fetch lexicon first."
            }
        
        try:
            current = self.fetch_tool.current_lexicon
            path_parts = path.split('.')
            
            for part in path_parts:
                if isinstance(current, dict) and part in current:
                    current = current[part]
                else:
                    return {
                        "status": "not_found",
                        "message": f"Path '{path}' not found"
                    }
            
            return {
                "status": "success",
                "path": path,
                "value": self._format_value(current)
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error accessing path: {str(e)}"
            }
    
    def _format_value(self, value: Any) -> Any:
        if isinstance(value, dict) and len(value) > 10:
            return f"Object with {len(value)} properties: {list(value.keys())[:5]}..."
        elif isinstance(value, list) and len(value) > 20:
            return f"Array with {len(value)} items: {value[:5]}..."
        return value
    
    def get_definition(self):
        return {
            "type": "function",
            "name": "get_lexicon_value",
            "description": "Get exact value using path (e.g., 'section.subsection.key')",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Exact path to value"
                    }
                },
                "required": ["path"]
            }
        }

# Complete Setup Function
def setup_lexicon_tools(master_svc_client):
    """Setup all lexicon tools with vector search"""
    fetch_tool = LexiconFetchTool(master_svc_client)
    query_tool = LexiconQueryTool(fetch_tool)  # Now uses vectors!
    browse_tool = LexiconBrowseTool(fetch_tool)
    get_tool = LexiconGetTool(fetch_tool)
    
    return [fetch_tool, query_tool, browse_tool, get_tool]

# Installation Requirements
"""
pip install sentence-transformers faiss-cpu numpy

For GPU acceleration:
pip install faiss-gpu
"""

# Usage Example
"""
# Setup
tools = setup_lexicon_tools(master_svc_client)

# Workflow
1. fetch_lexicon("Model Y", "USA")
2. query_lexicon("extra factory")  # Vector search finds semantically similar
3. query_lexicon("how many factories", "manufacturing")  # With context
4. browse_lexicon("factories")  # Browse structure
5. get_lexicon_value("factories.extra_factories")  # Get exact value

# The vector search will now find:
# "extra factory" -> "extra_factories"
# "safety feature" -> "safety_features"  
# "paint color" -> "paint_colors"
# etc.
"""

# Performance Notes
"""
- Initial indexing: ~1-2 seconds for 10k chunks
- Query time: ~10-50ms per search
- Memory usage: ~100MB for 10k chunks
- Scales to 100k+ chunks easily

Vector search handles:
- Typos: "safty" -> "safety"
- Plurals: "factory" -> "factories"
- Synonyms: "color" -> "paint"
- Semantic similarity: "extra" -> "additional"
"""
