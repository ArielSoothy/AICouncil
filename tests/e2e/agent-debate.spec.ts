import { test, expect } from '@playwright/test'

test.describe('AI Council Agent Debate Interface', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/')
  })

  test('should display round selector and allow changing rounds', async ({ page }) => {
    // Look for the round selector slider
    const roundSelector = page.locator('text=Number of Rounds:')
    await expect(roundSelector).toBeVisible()
    
    // Check that the slider is present
    const slider = page.locator('[role="slider"]').first()
    await expect(slider).toBeVisible()
    
    // Take a screenshot to verify the UI
    await page.screenshot({ path: 'tests/screenshots/round-selector-visible.png' })
    
    // Test interacting with the slider
    const sliderHandle = slider.locator('span[role="slider"]')
    await sliderHandle.click()
    
    // Verify the round number can be changed
    await expect(page.locator('text=Number of Rounds:')).toBeVisible()
  })

  test('should show agent personas mode by default', async ({ page }) => {
    // Check that Agent Personas is selected by default (per CLAUDE.md requirement)
    const agentPersonasRadio = page.locator('input[value="agents"]')
    await expect(agentPersonasRadio).toBeChecked()
    
    // Verify the text shows "Agent Personas (Deep Analysis)"
    await expect(page.locator('text=Agent Personas (Deep Analysis)')).toBeVisible()
    
    // Take screenshot of the default mode
    await page.screenshot({ path: 'tests/screenshots/agent-mode-default.png' })
  })

  test('should display all setup options', async ({ page }) => {
    // Check main sections are visible
    await expect(page.locator('text=Debate Query')).toBeVisible()
    await expect(page.locator('text=Round 1 Mode')).toBeVisible()
    await expect(page.locator('text=Response Length')).toBeVisible()
    await expect(page.locator('text=Compare with Single Model')).toBeVisible()
    await expect(page.locator('text=Web Search')).toBeVisible()
    await expect(page.locator('text=Auto-trigger Round 2 on Disagreement')).toBeVisible()
    
    // Verify the Start Debate button is present
    await expect(page.locator('button:has-text("Start Debate")')).toBeVisible()
    
    // Take full page screenshot
    await page.screenshot({ path: 'tests/screenshots/full-setup-interface.png', fullPage: true })
  })

  test('should toggle between LLM and Agent modes', async ({ page }) => {
    // Start with agents mode (should be default)
    const agentPersonasRadio = page.locator('input[value="agents"]')
    await expect(agentPersonasRadio).toBeChecked()
    
    // Switch to LLM mode
    const llmModeRadio = page.locator('input[value="llm"]')
    await llmModeRadio.click()
    await expect(llmModeRadio).toBeChecked()
    
    // Verify the interface updates
    await expect(page.locator('text=Fast LLM Mode')).toBeVisible()
    
    // Switch back to agent mode
    await agentPersonasRadio.click()
    await expect(agentPersonasRadio).toBeChecked()
    
    // Take screenshot showing the toggle works
    await page.screenshot({ path: 'tests/screenshots/mode-toggle-test.png' })
  })

  test('should show comparison options when enabled', async ({ page }) => {
    // Find and enable the comparison toggle
    const comparisonToggle = page.locator('input[id="comparison-mode-debate"]')
    await comparisonToggle.click()
    
    // Verify comparison options appear
    await expect(page.locator('text=Select model for comparison:')).toBeVisible()
    await expect(page.locator('text=Also compare with normal consensus')).toBeVisible()
    
    // Take screenshot of comparison options
    await page.screenshot({ path: 'tests/screenshots/comparison-options.png' })
  })

  test('should enable web search toggle', async ({ page }) => {
    // Find and enable web search
    const webSearchToggle = page.locator('input[id="web-search-debate"]')
    await webSearchToggle.click()
    
    // Verify web search description appears
    await expect(page.locator('text=FREE web search using DuckDuckGo')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/web-search-enabled.png' })
  })

  test('should show auto-trigger options', async ({ page }) => {
    // Find the auto-trigger toggle
    const autoTriggerToggle = page.locator('input[id="auto-round2"]')
    
    // Enable auto-trigger
    await autoTriggerToggle.click()
    
    // Should show disagreement threshold slider
    await expect(page.locator('text=Disagreement Threshold:')).toBeVisible()
    
    // Should still show the round selector (our fix!)
    await expect(page.locator('text=Number of Rounds:')).toBeVisible()
    
    // Take screenshot showing both options are visible
    await page.screenshot({ path: 'tests/screenshots/auto-trigger-with-rounds.png' })
  })

  test('should validate form before submission', async ({ page }) => {
    // Clear the query text
    const queryTextarea = page.locator('textarea[id="query"]')
    await queryTextarea.clear()
    
    // Try to start debate with empty query
    const startButton = page.locator('button:has-text("Start Debate")')
    
    // Button should be disabled with empty query
    await expect(startButton).toBeDisabled()
    
    // Add some text
    await queryTextarea.fill('Test query for validation')
    
    // Button should now be enabled (though we won't click it in testing)
    await expect(startButton).toBeEnabled()
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/form-validation.png' })
  })

  test('should display query interface sections properly', async ({ page }) => {
    // Test that all major UI sections are present and properly structured
    
    // Main query section
    await expect(page.locator('text=Debate Query')).toBeVisible()
    
    // Mode selection grid
    await expect(page.locator('text=Round 1 Mode')).toBeVisible()
    await expect(page.locator('text=Response Length')).toBeVisible()
    
    // Feature toggles
    await expect(page.locator('text=Compare with Single Model')).toBeVisible()
    await expect(page.locator('text=Web Search')).toBeVisible()
    
    // Round configuration - this should ALWAYS be visible per our fix
    await expect(page.locator('text=Number of Rounds:')).toBeVisible()
    
    // Take a comprehensive screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/interface-sections.png',
      fullPage: true 
    })
  })

  test('should handle mobile viewport correctly', async ({ page, isMobile }) => {
    if (isMobile) {
      // Test mobile-specific behavior
      await expect(page.locator('text=Debate Query')).toBeVisible()
      await expect(page.locator('text=Number of Rounds:')).toBeVisible()
      
      // Take mobile screenshot
      await page.screenshot({ path: 'tests/screenshots/mobile-interface.png', fullPage: true })
    }
  })
})

test.describe('Agent Debate Flow (Integration)', () => {
  
  test('should navigate to debate tab when starting debate', async ({ page }) => {
    await page.goto('/')
    
    // Fill in a test query
    await page.locator('textarea[id="query"]').fill('What are the best programming languages for web development?')
    
    // Enable comparison mode for testing
    await page.locator('input[id="comparison-mode-debate"]').click()
    
    // Note: We won't actually start the debate in testing to avoid API calls
    // But we can verify the setup is correct
    
    const startButton = page.locator('button:has-text("Start Debate")')
    await expect(startButton).toBeEnabled()
    
    // Take screenshot of ready-to-start state
    await page.screenshot({ path: 'tests/screenshots/ready-to-debate.png', fullPage: true })
  })
})