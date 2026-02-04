# AI Agent Prompt: Create Zotero-to-Anytype Sync Plugin

## Mission
You are tasked with creating "Anytero" - a Zotero plugin that syncs bibliographic items and notes from Zotero to Anytype, based on the existing Notero plugin architecture.

## Context
- **Source Project**: Notero - A Zotero plugin that syncs items to Notion (https://github.com/dvanoni/notero)
- **Target**: Create a similar plugin that syncs Zotero items to Anytype instead of Notion
- **Key Difference**: Anytype uses a local API (localhost:31009) with challenge-response authentication, while Notion uses cloud OAuth

## Your Tasks

### Phase 1: Analysis & Setup
1. **Clone and analyze the Notero repository**
   - Understand the plugin architecture
   - Map out the key components:
     - Zotero event listeners (item creation, modification)
     - API client implementation (currently for Notion)
     - Data transformation logic
     - UI preferences panel
     - Build system and configuration

2. **Study Anytype API**
   - Review documentation at https://developers.anytype.io/
   - Understand authentication flow (challenge-response with 4-digit code)
   - Map API endpoints needed:
     - Object creation
     - Object updates
     - Property management
     - Space/workspace handling

3. **Create project structure**
   - Fork/copy Notero structure
   - Rename to "Anytero" or "Zotero-Anytype-Sync"
   - Update package.json with new name and description

### Phase 2: Core Development

#### 2.1 Replace Notion API Client with Anytype API Client

**Files to modify:**
- `src/content/api/` directory - Replace Notion API calls with Anytype API calls

**Key changes needed:**
```typescript
// OLD (Notion):
- OAuth-based authentication
- Cloud API endpoint (api.notion.com)
- Database/page model

// NEW (Anytype):
- Local API endpoint (http://localhost:31009)
- Challenge-response authentication
- Object/property model
```

**Authentication Implementation:**
```typescript
// Anytype authentication flow:
1. POST /auth/start → get challenge_id and 4-digit code
2. Display code to user in Anytype desktop app
3. Poll /auth/status/{challenge_id} until approved
4. Receive JWT token
5. Use token in Authorization header for API calls
```

#### 2.2 Data Mapping

**Map Zotero fields to Anytype object properties:**

| Zotero Field | Anytype Property | Notes |
|--------------|------------------|-------|
| title | Name (title property) | Required |
| creators/authors | Authors (text) | Format as text |
| abstractNote | Abstract (text) | |
| date | Date (text) | |
| DOI | DOI (URL) | |
| url | URL (URL) | |
| publicationTitle | Publication (text) | |
| tags | Tags (multi-select/tags) | |
| collections | Collections (multi-select) | |
| dateAdded | Date Added (date) | |
| dateModified | Date Modified (date) | |
| itemType | Item Type (select) | |

#### 2.3 Configuration & Preferences

**Update Zotero preferences UI:**
- Remove Notion-specific settings (OAuth, database selection)
- Add Anytype-specific settings:
  - API endpoint (default: http://localhost:31009)
  - Space/workspace selection
  - Object type selection
  - Challenge code display area

**Files to modify:**
- `src/content/preferences/` - Update preference panes
- Remove OAuth connection flow
- Add Anytype authentication UI

#### 2.4 Sync Logic

**Maintain Notero's sync patterns:**
- Watch specified collections for changes
- On item add/modify:
  1. Check if Anytype object exists (via stored link)
  2. Create or update Anytype object
  3. Add 'anytype' tag to Zotero item
  4. Add link attachment pointing to Anytype object

**Files to modify:**
- `src/content/sync/` - Update sync manager
- Ensure error handling for:
  - Anytype app not running
  - Authentication failures
  - Network errors
  - Object conflicts

#### 2.5 Notes Syncing

**Replicate Notero's notes syncing:**
- Sync Zotero notes as content blocks in Anytype objects
- Handle PDF annotations
- Maintain parent-child relationships

### Phase 3: Build System & Testing

#### 3.1 Update Build Configuration

**Files to modify:**
- `package.json` - Update name, description, repository
- `README.md` - Update documentation for Anytype
- `src/install.rdf` or manifest - Update plugin metadata
- Remove Notion-specific dependencies
- Add Anytype API client dependencies (if creating a wrapper)

#### 3.2 Create Anytype TypeScript Client (Optional but Recommended)

Since there's no official TypeScript client, you may want to create a thin wrapper:

```typescript
// src/content/api/anytype/client.ts
export class AnytypeClient {
  private baseUrl = 'http://localhost:31009';
  private token: string | null = null;

  async authenticate(): Promise<void> {
    // Implement challenge-response flow
  }

  async createObject(spaceId: string, typeId: string, properties: object): Promise<string> {
    // Create object via API
  }

  async updateObject(objectId: string, properties: object): Promise<void> {
    // Update object via API
  }

  async getObject(objectId: string): Promise<object> {
    // Retrieve object via API
  }

  // ... other methods
}
```

#### 3.3 Testing Strategy

**Create test suite:**
1. Unit tests for API client
2. Integration tests with mock Anytype API
3. Manual testing with real Zotero + Anytype setup

**Test scenarios:**
- New item sync
- Modified item sync
- Bulk sync of existing items
- Note syncing
- Error handling (Anytype offline, auth failures)
- Collection filtering

### Phase 4: Documentation & Polish

#### 4.1 Update Documentation

**Create comprehensive docs:**
- Installation guide (similar to Notero)
- Setup instructions:
  1. Install plugin in Zotero
  2. Ensure Anytype desktop app is running
  3. Authenticate via challenge code
  4. Select workspace/space
  5. Configure collections to monitor

- Troubleshooting guide:
  - "Anytype not running" errors
  - Authentication failures
  - API version mismatches

#### 4.2 Create Example Templates

**Provide Anytype templates:**
- Basic bibliographic template
- Advanced template with views
- Research notes template

### Phase 5: Release & Distribution

#### 5.1 Prepare for Release

- Create `.xpi` package
- Test installation process
- Create release notes
- Set up GitHub releases

#### 5.2 Community Engagement

- Post in Anytype community forums
- Post in Zotero forums
- Create demo video
- Write blog post

## Technical Specifications

### Requirements
- **Zotero**: 7.0+ (or maintain 6.0.27+ support like Notero)
- **Anytype**: Desktop app running with API enabled
- **Node.js**: For development (match Notero's version)
- **TypeScript**: 5.x+

### API Details

**Anytype API Base:**
- Endpoint: `http://localhost:31009`
- API Version: `2025-05-20` (current)
- Authentication: JWT via challenge-response

**Key Endpoints:**
- `POST /auth/start` - Start authentication
- `GET /auth/status/{challenge_id}` - Check auth status
- `POST /objects` - Create object
- `PATCH /objects/{id}` - Update object
- `GET /objects/{id}` - Get object
- `POST /objects/query` - Query objects

### Code Quality Standards

- Follow Notero's ESLint configuration
- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Maintain test coverage similar to Notero
- Use Prettier for formatting

## Deliverables

### Minimum Viable Product (MVP)
1. ✅ Plugin installs in Zotero 7.0+
2. ✅ Authenticates with Anytype via challenge-response
3. ✅ Syncs basic item metadata (title, authors, date, etc.)
4. ✅ Creates objects in selected Anytype space
5. ✅ Adds tags and link attachments in Zotero
6. ✅ Configuration UI in Zotero preferences

### Full Feature Set (Match Notero)
1. ✅ All MVP features
2. ✅ Note syncing with formatting
3. ✅ PDF annotation extraction
4. ✅ Bulk sync from context menu
5. ✅ Collection filtering
6. ✅ Automatic sync on modify
7. ✅ Better BibTeX citation key support
8. ✅ Comprehensive error handling
9. ✅ Full documentation
10. ✅ Example templates

### Nice-to-Have Features
- Bidirectional sync (Anytype → Zotero)
- Conflict resolution UI
- Multiple space support
- Custom property mapping
- Sync progress indicators
- Background sync queue

## Success Criteria

### Functional
- [ ] Successfully syncs 100+ items without errors
- [ ] Handles network interruptions gracefully
- [ ] Updates existing objects correctly
- [ ] Notes sync with proper formatting
- [ ] Works with multiple Zotero collections

### Technical
- [ ] Code passes all linting checks
- [ ] TypeScript compiles without errors
- [ ] Test coverage >70%
- [ ] Build produces working `.xpi` file
- [ ] No memory leaks during long sync sessions

### User Experience
- [ ] Clear error messages
- [ ] Intuitive setup process
- [ ] Works without deep technical knowledge
- [ ] Responsive during sync (doesn't freeze Zotero)
- [ ] Progress feedback for long operations

## Resources & References

### Source Material
- Notero repository: https://github.com/dvanoni/notero
- Anytype API docs: https://developers.anytype.io/
- Anytype CLI: https://github.com/anyproto/anytype-cli
- Zotero plugin development: https://www.zotero.org/support/dev/client_coding/plugin_development

### Similar Projects
- Anytype Raycast extension (for API examples)
- Anytype MCP server (for API patterns)
- Other Zotero sync plugins

### Community
- Anytype community: https://community.anytype.io
- Zotero forums: https://forums.zotero.org/

## Development Workflow

### Step-by-Step Execution

**Day 1-2: Setup & Analysis**
1. Clone Notero repository
2. Set up development environment
3. Run Notero locally to understand behavior
4. Document current architecture
5. Test Anytype API with simple scripts

**Day 3-5: API Client Development**
1. Create Anytype API client class
2. Implement authentication flow
3. Implement CRUD operations
4. Write unit tests
5. Test against real Anytype instance

**Day 6-8: Core Sync Logic**
1. Adapt Notero's sync manager
2. Implement data transformation
3. Handle object creation/updates
4. Add error handling
5. Test with sample Zotero library

**Day 9-10: UI & Configuration**
1. Update preferences panel
2. Add authentication UI
3. Add space/type selection
4. Test user flows

**Day 11-12: Notes & Advanced Features**
1. Implement note syncing
2. Add PDF annotation support
3. Add bulk sync
4. Polish edge cases

**Day 13-14: Testing & Documentation**
1. Comprehensive testing
2. Write documentation
3. Create example templates
4. Prepare for release

**Day 15: Release**
1. Build final `.xpi`
2. Create GitHub release
3. Post in communities
4. Celebrate! 🎉

## Important Considerations

### Limitations to Document
1. **Requires Anytype Desktop App Running**: Unlike Notion's cloud API, Anytype's API only works when the desktop app is running
2. **Local-Only**: No cloud sync without the desktop app
3. **API Stability**: Anytype API is newer, may have breaking changes
4. **No Official TypeScript SDK**: Will need to create wrapper or use raw HTTP

### Risk Mitigation
- Implement robust error handling for "Anytype not available"
- Cache authentication tokens appropriately
- Handle API version changes gracefully
- Provide clear status indicators (connected/disconnected)

### Privacy & Security
- Tokens stored securely in Zotero's secure storage
- No cloud transmission (all local)
- Document data handling in privacy policy

## Questions to Answer During Development

1. Should we create objects in the default space or let users select?
2. How to handle Anytype object type creation (auto-create or manual)?
3. Should we support multiple spaces simultaneously?
4. How to handle offline scenarios?
5. What to do if Anytype app closes mid-sync?

## Final Notes

This is a well-scoped project with a clear template (Notero) to follow. The main technical challenge is replacing the Notion API integration with Anytype's local API, but the overall architecture remains the same.

**Estimated Development Time:**
- Experienced developer: 40-60 hours
- Intermediate developer: 80-120 hours
- Beginner: 120-160 hours

**Good luck building Anytero! 🚀**