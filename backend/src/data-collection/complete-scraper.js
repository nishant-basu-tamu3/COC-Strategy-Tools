const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const CONFIG = {
  // Sitemap URL for CoC Wiki
  sitemapUrl: 'https://clashofclans.fandom.com/sitemap-newsitemapxml-NS_0-id-2063-408103.xml',
  
  // Output paths
  outputDir: path.join(__dirname, '../../data'),
  rawDir: path.join(__dirname, '../../data/raw'),
  
  // Request delay to be nice to the server (ms)
  requestDelay: 1000,
  
  // Batch size for processing URLs
  batchSize: 5
};

/**
 * Fetch and parse the sitemap to extract URLs
 * @returns {Promise<Object>} - Categorized URLs
 */
async function parseSitemap() {
  try {
    console.log(`Fetching sitemap: ${CONFIG.sitemapUrl}`);
    const response = await axios.get(CONFIG.sitemapUrl);
    const $ = cheerio.load(response.data, {
      xmlMode: true
    });
    
    const urls = [];
    
    // Extract URLs from the sitemap
    $('url').each((i, element) => {
      const loc = $(element).find('loc').text();
      const lastmod = $(element).find('lastmod').text();
      
      urls.push({
        url: loc,
        lastModified: lastmod
      });
    });
    
    console.log(`Found ${urls.length} URLs in sitemap`);
    return categorizeUrls(urls);
  } catch (error) {
    console.error(`Error parsing sitemap: ${error.message}`);
    return {
      troops: [],
      defenses: [],
      spells: [],
      heroes: [],
      other: []
    };
  }
}

/**
 * Categorize URLs into different types (troops, defenses, etc.)
 * @param {Array} urls - List of URL objects
 * @returns {Object} - Object with categorized URLs
 */
function categorizeUrls(urls) {
  const result = {
    troops: [],
    defenses: [],
    spells: [],
    heroes: [],
    other: []
  };
  
  for (const urlObj of urls) {
    const url = urlObj.url;
    const lastModified = urlObj.lastModified;
    
    // Skip category pages, templates, etc.
    if (url.includes('/Category:') || 
        url.includes('/Template:') || 
        url.includes('/File:') ||
        url.includes('Strategy_Guides')) {
      continue;
    }
    
    // Categorize based on URL patterns
    if (url.includes('/Defensive_Buildings') || 
        url.includes('/Cannon') || 
        url.includes('/Archer_Tower') || 
        url.includes('/Mortar') || 
        url.includes('/Air_Defense') || 
        url.includes('/Wizard_Tower') || 
        url.includes('/Hidden_Tesla') || 
        url.includes('/X-Bow') || 
        url.includes('/Inferno_Tower') ||
        url.includes('/Eagle_Artillery') ||
        url.includes('/Bomb_Tower') ||
        url.includes('/Scattershot')) {
      result.defenses.push({ url, lastModified });
    } else if (url.includes('/Barbarian') || 
               url.includes('/Archer') || 
               url.includes('/Giant') || 
               url.includes('/Goblin') || 
               url.includes('/Wall_Breaker') || 
               url.includes('/Balloon') || 
               url.includes('/Wizard') || 
               url.includes('/Healer') || 
               url.includes('/Dragon') || 
               url.includes('/P.E.K.K.A') ||
               url.includes('/Minion') ||
               url.includes('/Hog_Rider') ||
               url.includes('/Valkyrie') ||
               url.includes('/Golem') ||
               url.includes('/Witch') ||
               url.includes('/Lava_Hound') ||
               url.includes('/Bowler') ||
               url.includes('/Baby_Dragon') ||
               url.includes('/Miner') ||
               url.includes('/Super_')) {
      // Exclude specific disambiguation pages
      if (!url.includes('disambiguation') && !url.includes('Builder_Base')) {
        result.troops.push({ url, lastModified });
      }
    } else if (url.includes('/Spell') || 
               url.includes('_Spell') ||
               url.includes('/Lightning_Spell') || 
               url.includes('/Healing_Spell') || 
               url.includes('/Rage_Spell') || 
               url.includes('/Jump_Spell') ||
               url.includes('/Freeze_Spell') ||
               url.includes('/Clone_Spell') ||
               url.includes('/Poison_Spell') ||
               url.includes('/Earthquake_Spell') ||
               url.includes('/Haste_Spell') ||
               url.includes('/Skeleton_Spell') ||
               url.includes('/Bat_Spell')) {
      if (!url.includes('Builder_Base')) {
        result.spells.push({ url, lastModified });
      }
    } else if (url.includes('/Barbarian_King') || 
               url.includes('/Archer_Queen') || 
               url.includes('/Grand_Warden') || 
               url.includes('/Royal_Champion') ||
               url.includes('/Heroes')) {
      if (!url.includes('/Skin') && !url.includes('Builder_Base')) {
        result.heroes.push({ url, lastModified });
      }
    } else {
      result.other.push({ url, lastModified });
    }
  }
  
  return result;
}

/**
 * Fetch HTML content from a URL
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} - The HTML content
 */
async function fetchPage(url) {
  try {
    console.log(`Fetching ${url}...`);
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Clean text by removing extra whitespace and special characters
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Extract image URL from the page
 * @param {CheerioStatic} $ - Loaded Cheerio object
 * @returns {string|null} - Image URL or null if not found
 */
function extractImageUrl($) {
  // Try to get the main image from the infobox
  const infoboxImage = $('.portable-infobox .image img').first();
  if (infoboxImage.length > 0) {
    return infoboxImage.attr('src') || infoboxImage.attr('data-src');
  }
  
  // Fallback to any image in the content
  const contentImage = $('.mw-parser-output .image img').first();
  if (contentImage.length > 0) {
    return contentImage.attr('src') || contentImage.attr('data-src');
  }
  
  return null;
}

/**
 * Extract special abilities or notes from the page
 * @param {CheerioStatic} $ - Loaded Cheerio object
 * @returns {string[]} - List of special abilities or notes
 */
function extractSpecialAbilities($) {
  const abilities = [];
  
  // Look for sections like "Special Ability", "Abilities", or "Skill"
  const headings = $('h2, h3, h4');
  
  headings.each((i, heading) => {
    const headingText = $(heading).text().trim().toLowerCase();
    if (
      headingText.includes('ability') || 
      headingText.includes('abilities') || 
      headingText.includes('skill') ||
      headingText.includes('special')
    ) {
      // Get the paragraphs following this heading
      let element = $(heading).next();
      while (element.length > 0 && !element.is('h2, h3, h4')) {
        if (element.is('p')) {
          const text = cleanText(element.text());
          if (text.length > 10) { // Ignore very short paragraphs
            abilities.push(text);
          }
        }
        element = element.next();
      }
    }
  });
  
  return abilities;
}

/**
 * Extract description from the page
 * @param {CheerioStatic} $ - Loaded Cheerio object
 * @returns {string} - Description text
 */
function extractDescription($) {
  // Usually the first few paragraphs contain the description
  let description = '';
  const paragraphs = $('.mw-parser-output > p');
  
  for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
    const text = cleanText($(paragraphs[i]).text());
    if (text.length > 30) { // Skip very short paragraphs
      description += text + ' ';
    }
  }
  
  return description.trim();
}

/**
 * Extract basic information from a troop page
 * @param {CheerioStatic} $ - Loaded Cheerio object
 * @param {string} url - URL of the page
 * @returns {Object} - Extracted troop data
 */
function extractTroopData($, url) {
  // Get the troop name from the page title
  const name = $('h1.page-header__title').text().trim();
  // Create safe ID - replace slashes with underscores to avoid directory issues
  const id = name.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
  
  // Initialize troop data object
  const troopData = {
    id,
    name,
    url,
    type: 'troop',
    description: extractDescription($),
    housing_space: null,
    movement_speed: null,
    attack_speed: null,
    range: null,
    target_preference: null,
    damage_type: null,
    image_url: extractImageUrl($),
    special_abilities: extractSpecialAbilities($),
    training_time: null,
    training_cost: null,
    stats_by_level: []
  };
  
  // Extract info from the infobox (right sidebar)
  const infobox = $('.portable-infobox');
  
  infobox.find('.pi-item').each((i, element) => {
    const label = $(element).find('.pi-data-label').text().trim();
    const value = $(element).find('.pi-data-value').text().trim();
    
    if (label === 'Housing Space') {
      troopData.housing_space = parseInt(value) || null;
    } else if (label === 'Movement Speed') {
      troopData.movement_speed = parseFloat(value) || value;
    } else if (label === 'Attack Speed') {
      troopData.attack_speed = parseFloat(value) || value;
    } else if (label === 'Attack Range') {
      troopData.range = parseFloat(value) || value;
    } else if (label === 'Preferred Target') {
      troopData.target_preference = value;
    } else if (label === 'Damage Type') {
      troopData.damage_type = value.toLowerCase();
    } else if (label === 'Training Time') {
      troopData.training_time = value;
    } else if (label === 'Training Cost') {
      troopData.training_cost = value;
    }
  });
  
  // Extract stats by level from tables
  const statsTables = $('table.wikitable');
  
  statsTables.each((i, table) => {
    const headers = [];
    const levelData = [];
    
    // Extract table headers
    $(table).find('th').each((j, header) => {
      headers.push($(header).text().trim().toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, ''));
    });
    
    // Check if this table contains level data (should have level, hp, dps, etc.)
    if (headers.includes('level') || headers.includes('hitpoints') || headers.includes('damage') || headers.includes('dps')) {
      // Extract table rows
      $(table).find('tr').each((j, row) => {
        if (j === 0) return; // Skip header row
        
        const rowData = {};
        $(row).find('td').each((k, cell) => {
          if (headers[k]) {
            const value = $(cell).text().trim();
            // Try to convert to number if possible
            rowData[headers[k]] = !isNaN(value) && value !== '' ? parseFloat(value) : value;
          }
        });
        
        if (Object.keys(rowData).length > 0) {
          levelData.push(rowData);
        }
      });
      
      // If we found data, add it to the troop's stats
      if (levelData.length > 0) {
        troopData.stats_by_level = levelData;
      }
    }
  });
  
  return troopData;
}

/**
 * Extract basic information from a defense page
 * @param {CheerioStatic} $ - Loaded Cheerio object
 * @param {string} url - URL of the page
 * @returns {Object} - Extracted defense data
 */
function extractDefenseData($, url) {
  // Get the defense name from the page title
  let name = $('h1.page-header__title').text().trim();
  // Remove "/Home Village" if present
  name = name.replace(/\/Home Village$/, '');
  
  // Create safe ID - replace slashes with underscores to avoid directory issues
  const id = name.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
  
  // Initialize defense data object
  const defenseData = {
    id,
    name,
    url,
    type: 'defense',
    description: extractDescription($),
    targets: null,
    damage_type: null,
    range: null,
    attack_speed: null,
    special_properties: extractSpecialAbilities($),
    image_url: extractImageUrl($),
    build_time: null,
    build_cost: null,
    stats_by_level: []
  };
  
  // Extract info from the infobox (right sidebar)
  const infobox = $('.portable-infobox');
  
  infobox.find('.pi-item').each((i, element) => {
    const label = $(element).find('.pi-data-label').text().trim();
    const value = $(element).find('.pi-data-value').text().trim();
    
    if (label === 'Targets') {
      defenseData.targets = value.toLowerCase();
    } else if (label === 'Damage Type') {
      defenseData.damage_type = value.toLowerCase();
    } else if (label === 'Attack Range') {
      defenseData.range = parseFloat(value) || value;
    } else if (label === 'Attack Speed') {
      defenseData.attack_speed = parseFloat(value) || value;
    } else if (label === 'Build Time') {
      defenseData.build_time = value;
    } else if (label === 'Build Cost') {
      defenseData.build_cost = value;
    }
  });
  
  // Extract stats by level from tables
  const statsTables = $('table.wikitable');
  
  statsTables.each((i, table) => {
    const headers = [];
    const levelData = [];
    
    // Extract table headers
    $(table).find('th').each((j, header) => {
      headers.push($(header).text().trim().toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, ''));
    });
    
    // Check if this table contains level data
    if (headers.includes('level') || headers.includes('hitpoints') || headers.includes('damage') || headers.includes('dps')) {
      // Extract table rows
      $(table).find('tr').each((j, row) => {
        if (j === 0) return; // Skip header row
        
        const rowData = {};
        $(row).find('td').each((k, cell) => {
          if (headers[k]) {
            const value = $(cell).text().trim();
            // Try to convert to number if possible
            rowData[headers[k]] = !isNaN(value) && value !== '' ? parseFloat(value) : value;
          }
        });
        
        if (Object.keys(rowData).length > 0) {
          levelData.push(rowData);
        }
      });
      
      // If we found data, add it to the defense's stats
      if (levelData.length > 0) {
        defenseData.stats_by_level = levelData;
      }
    }
  });
  
  return defenseData;
}

/**
 * Extract basic information from a spell page
 * @param {CheerioStatic} $ - Loaded Cheerio object
 * @param {string} url - URL of the page
 * @returns {Object} - Extracted spell data
 */
function extractSpellData($, url) {
  // Get the spell name from the page title
  let name = $('h1.page-header__title').text().trim();
  // Remove "/Home Village" if present
  name = name.replace(/\/Home Village$/, '');
  
  // Create safe ID - replace slashes with underscores to avoid directory issues
  const id = name.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
  
  // Initialize spell data object
  const spellData = {
    id,
    name,
    url,
    type: 'spell',
    description: extractDescription($),
    housing_space: null,
    research_time: null,
    research_cost: null,
    laboratory_level: null,
    effect: extractSpecialAbilities($),
    image_url: extractImageUrl($),
    brewing_time: null,
    brewing_cost: null,
    stats_by_level: []
  };
  
  // Extract info from the infobox (right sidebar)
  const infobox = $('.portable-infobox');
  
  infobox.find('.pi-item').each((i, element) => {
    const label = $(element).find('.pi-data-label').text().trim();
    const value = $(element).find('.pi-data-value').text().trim();
    
    if (label === 'Housing Space') {
      spellData.housing_space = parseInt(value) || null;
    } else if (label === 'Research Time') {
      spellData.research_time = value;
    } else if (label === 'Research Cost') {
      spellData.research_cost = value;
    } else if (label === 'Laboratory Level') {
      spellData.laboratory_level = parseInt(value) || null;
    } else if (label === 'Brewing Time') {
      spellData.brewing_time = value;
    } else if (label === 'Brewing Cost') {
      spellData.brewing_cost = value;
    }
  });
  
  // Extract stats by level from tables
  const statsTables = $('table.wikitable');
  
  statsTables.each((i, table) => {
    const headers = [];
    const levelData = [];
    
    // Extract table headers
    $(table).find('th').each((j, header) => {
      headers.push($(header).text().trim().toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, ''));
    });
    
    // Check if this table contains level data
    if (headers.includes('level') || headers.includes('radius') || headers.includes('duration') || headers.includes('damage')) {
      // Extract table rows
      $(table).find('tr').each((j, row) => {
        if (j === 0) return; // Skip header row
        
        const rowData = {};
        $(row).find('td').each((k, cell) => {
          if (headers[k]) {
            const value = $(cell).text().trim();
            // Try to convert to number if possible
            rowData[headers[k]] = !isNaN(value) && value !== '' ? parseFloat(value) : value;
          }
        });
        
        if (Object.keys(rowData).length > 0) {
          levelData.push(rowData);
        }
      });
      
      // If we found data, add it to the spell's stats
      if (levelData.length > 0) {
        spellData.stats_by_level = levelData;
      }
    }
  });
  
  return spellData;
}

/**
 * Extract basic information from a hero page
 * @param {CheerioStatic} $ - Loaded Cheerio object
 * @param {string} url - URL of the page
 * @returns {Object} - Extracted hero data
 */
function extractHeroData($, url) {
  // Get the hero name from the page title
  const name = $('h1.page-header__title').text().trim();
  if (!name) return null;
  
  // Skip pages that aren't actual hero pages
  if (name === "Heroes" || name.includes("Altar") || name.includes("Hall")) {
    console.warn(`Skipping non-hero page: ${url}`);
    return null;
  }
  
  // Create safe ID - replace slashes with underscores to avoid directory issues
  const id = name.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
  
  // Initialize hero data object
  const heroData = {
    id,
    name,
    url,
    type: 'hero',
    description: extractDescription($),
    image_url: extractImageUrl($),
    special_abilities: extractSpecialAbilities($),
    stats_by_level: []
  };
  
  // Extract stats from tables
  const statsTables = $('.hero-statistics-table');
  
  // If we found stat tables, extract the data
  if (statsTables.length > 0) {
    // Extract basic properties from the first table
    const firstTable = $(statsTables[0]);
    const firstRow = firstTable.find('tbody tr').eq(1); // Get the first data row
    
    if (firstRow.length > 0) {
      const cells = firstRow.find('td');
      
      if (cells.length >= 6) {
        heroData.preferred_target = cells.eq(0).text().trim();
        heroData.attack_type = cells.eq(1).text().trim();
        heroData.attack_speed = cells.eq(2).text().trim();
        heroData.movement_speed = cells.eq(3).text().trim();
        heroData.range = cells.eq(4).text().trim();
        heroData.search_radius = cells.eq(5).text().trim();
      }
    }
    
    // Extract level stats from the second table
    if (statsTables.length > 1) {
      const secondTable = $(statsTables[1]);
      const rows = secondTable.find('tbody tr');
      
      // Skip the header row
      rows.each((i, row) => {
        if (i === 0) return; // Skip header row
        
        const cells = $(row).find('td');
        if (cells.length >= 8) {
          const levelData = {
            level: parseInt(cells.eq(0).text().trim()) || cells.eq(0).text().trim(),
            dps: parseFloat(cells.eq(1).text().trim()) || cells.eq(1).text().trim(),
            dph: parseFloat(cells.eq(2).text().trim()) || cells.eq(2).text().trim(),
            hitpoints: parseFloat(cells.eq(3).text().trim()) || cells.eq(3).text().trim(),
            health_recovery: parseFloat(cells.eq(4).text().trim()) || cells.eq(4).text().trim(),
            upgrade_cost: cells.eq(5).text().trim(),
            upgrade_time: cells.eq(6).text().trim(),
            hero_hall_required: parseInt(cells.eq(7).text().trim()) || cells.eq(7).text().trim()
          };
          
          heroData.stats_by_level.push(levelData);
        }
      });
    }
  } else {
    // Try to extract info from the legacy infobox if stat tables are not present
    const infobox = $('aside.portable-infobox');
    
    if (infobox.length) {
      // If infobox title exists, use it as the hero name
      const infoboxTitle = infobox.find('h2.pi-title').text().trim();
      if (infoboxTitle) {
        heroData.name = infoboxTitle;
      }
      
      // Get image if available
      const infoboxImage = infobox.find('figure img').attr('src');
      if (infoboxImage) {
        heroData.image_url = infoboxImage;
      }
      
      // Extract all properties from infobox
      infobox.find('.pi-data').each((i, el) => {
        const label = $(el).find('.pi-data-label').text().trim();
        const value = $(el).find('.pi-data-value').text().trim();
        if (label && value) {
          heroData[label.toLowerCase().replace(/\s+/g, '_')] = value;
        }
      });
    }
  }
  
  // Extract hero equipment section if available
  const equipmentSection = $('h2:contains("Hero Equipment")').next('ul');
  if (equipmentSection.length > 0) {
    const equipmentItems = [];
    equipmentSection.find('li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 10) {
        equipmentItems.push(text);
      }
    });
    
    if (equipmentItems.length > 0) {
      heroData.equipment = equipmentItems;
    }
  }
  
  // Extract data from table elements if available
  const tables = $('.wikitable');
  tables.each((i, table) => {
    const tableHeaders = [];
    $(table).find('th').each((j, header) => {
      tableHeaders.push($(header).text().trim().toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, ''));
    });
    
    // Check if this looks like a stats table
    if (tableHeaders.includes('level') || 
        tableHeaders.includes('hitpoints') || 
        tableHeaders.includes('damage') || 
        tableHeaders.includes('dps')) {
      
      // Extract rows
      const tableData = [];
      $(table).find('tr').each((j, row) => {
        if (j === 0) return; // Skip header row
        
        const rowData = {};
        $(row).find('td').each((k, cell) => {
          if (tableHeaders[k]) {
            const value = $(cell).text().trim();
            // Try to convert to number if possible
            rowData[tableHeaders[k]] = !isNaN(value) && value !== '' ? parseFloat(value) : value;
          }
        });
        
        if (Object.keys(rowData).length > 0) {
          tableData.push(rowData);
        }
      });
      
      // If we have data and no existing stats, use this
      if (tableData.length > 0 && heroData.stats_by_level.length === 0) {
        heroData.stats_by_level = tableData;
      }
    }
  });
  
  // Final validation - we need at least some data
  if (
    (!heroData.stats_by_level || heroData.stats_by_level.length === 0) &&
    (!heroData.special_abilities || heroData.special_abilities.length === 0) &&
    !heroData.description
  ) {
    console.warn(`Not enough data found for ${url}, skipping`);
    return null;
  }
  
  return heroData;
}


/**
 * Scrape data from a single URL
 * @param {Object} urlData - URL data object with url and lastModified
 * @param {string} type - Expected type ('troop', 'defense', 'spell', 'hero')
 * @returns {Promise<Object>} - Scraped data
 */
async function scrapeUrl(urlData, type) {
  const { url, lastModified } = urlData;
  const html = await fetchPage(url);
  if (!html) return null;
  
  const $ = cheerio.load(html);
  
  // Extract data based on page type
  if (type === 'troop') {
    return extractTroopData($, url);
  } else if (type === 'defense') {
    return extractDefenseData($, url);
  } else if (type === 'spell') {
    return extractSpellData($, url);
  } else if (type === 'hero') {
    return extractHeroData($, url);
  }
  
  return null;
}

/**
 * Process a batch of URLs
 * @param {Array} urls - URLs to process
 * @param {string} type - Type of URLs ('troop', 'defense', etc.)
 * @returns {Promise<Array>} - Scraped data
 */
async function processBatch(urls, type) {
  const results = [];
  
  // Process URLs in sequence to avoid overwhelming the server
  for (const url of urls) {
    const result = await scrapeUrl(url, type);
    if (result) results.push(result);
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
  }
  
  return results;
}

/**
 * Save data to JSON file
 * @param {Object[]} data - Data to save
 * @param {string} filename - Output filename
 * @returns {Promise<void>}
 */
async function saveToJson(data, filename) {
  const outputPath = path.join(CONFIG.outputDir, filename);
  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeJson(outputPath, data, { spaces: 2 });
  console.log(`Saved data to ${outputPath}`);
  
  try {
    // Also save individual files for each item
    await fs.ensureDir(CONFIG.rawDir);
    
    for (const item of data) {
      // Sanitize item id to be Windows-path-friendly (replace slashes with underscores)
      const safeId = item.id.replace(/\//g, '_');
      const itemPath = path.join(CONFIG.rawDir, `${item.type}_${safeId}.json`);
      await fs.writeJson(itemPath, item, { spaces: 2 });
    }
    console.log(`Saved individual files to ${CONFIG.rawDir}`);
  } catch (error) {
    console.error(`Error saving individual files: ${error.message}`);
  }
}

/**
 * Save URLs to file for later reference
 * @param {Object} urlCategories - Categorized URLs
 * @returns {Promise<void>}
 */
async function saveUrlsToFile(urlCategories) {
  const urlsPath = path.join(CONFIG.outputDir, 'urls.json');
  await fs.ensureDir(path.dirname(urlsPath));
  await fs.writeJson(urlsPath, urlCategories, { spaces: 2 });
  console.log(`Saved URL categories to ${urlsPath}`);
}

/**
 * Main function to run the scraper
 */
async function main() {
  try {
    console.log('Starting Clash of Clans Wiki scraper...');
    
    // Ensure output directories exist
    await fs.ensureDir(CONFIG.outputDir);
    await fs.ensureDir(CONFIG.rawDir);
    
    console.log('Parsing sitemap...');
    const urlCategories = await parseSitemap();
    
    // Save URLs for reference
    await saveUrlsToFile(urlCategories);
    
    // Print URL category summary
    console.log('\nURL Categories Summary:');
    for (const [category, urls] of Object.entries(urlCategories)) {
      console.log(`${category}: ${urls.length} URLs`);
    }
    
    // Process each category
    const categories = ['troops', 'defenses', 'spells', 'heroes'];
    
    for (const category of categories) {
      const urls = urlCategories[category];
      if (!urls || urls.length === 0) {
        console.log(`No URLs found for ${category}. Skipping.`);
        continue;
      }
      
      console.log(`\nProcessing ${category} (${urls.length} URLs)...`);
      
      const allData = [];
      
      // Process in batches
      for (let i = 0; i < urls.length; i += CONFIG.batchSize) {
        const batch = urls.slice(i, i + CONFIG.batchSize);
        console.log(`Processing batch ${Math.floor(i/CONFIG.batchSize) + 1}/${Math.ceil(urls.length/CONFIG.batchSize)}...`);
        
        const results = await processBatch(batch, category.slice(0, -1)); // Remove 's' to get singular type
        allData.push(...results);
        
        console.log(`Processed ${allData.length}/${urls.length} ${category}`);
      }
      
      // Save data
      if (allData.length > 0) {
        await saveToJson(allData, `${category}.json`);
      } else {
        console.log(`No data found for ${category}. Skipping save.`);
      }
    }
    
    console.log('\nScraping complete!');
    
  } catch (error) {
    console.error('Error running scraper:', error);
  }
}

// Run the scraper
main();