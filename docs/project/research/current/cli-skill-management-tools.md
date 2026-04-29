# Research Brief: CLI Tools for Managing Skills and Agent Instructions

**Last Updated**: 2025-12-24

**Status**: Complete

**Related**:

- [Skillz project documentation](../../../CLAUDE.md)
- [Agent instructions in AGENTS.md](../../../AGENTS.md)

---

## Executive Summary

This research investigates existing CLI tools and approaches for managing LLM agent skills, prompt instructions, and configuration files across different AI development environments. The goal is to understand the competitive landscape, identify best practices, and validate Skillz's unique positioning.

Skillz addresses the fragmentation problem where Claude Code, Cursor, Aider, and other tools each require skills/instructions in different formats. While several tools exist in adjacent spaces (dotfile managers, configuration syncers), very few specifically target the LLM agent skill management use case.

**Research Questions**:

1. What existing CLIs help manage agent skills, prompts, or LLM tool configurations?

2. How do developers currently sync instructions across multiple AI coding tools?

3. What patterns exist for managing reusable prompt templates or agent configurations?

4. Are there similar "write once, sync everywhere" patterns in adjacent domains we can learn from?

---

## Research Methodology

### Approach

- Web search for existing tools in the LLM/AI agent ecosystem
- GitHub repository exploration for similar projects
- Documentation review of major AI coding assistants (Claude Code, Cursor, Aider, Continue)
- Analysis of dotfile management and configuration sync patterns

### Sources

- GitHub repositories and documentation
- AI tool documentation sites
- Developer blogs and forum discussions
- Package registries (npm, PyPI)

---

## Research Findings

### LLM-Specific Skill/Prompt Management Tools

#### Skillport

**Status**: ✅ Complete

**Details**:

- Brings Agent Skills to any AI agent via CLI or MCP
- "Manage once, serve anywhere" philosophy
- Supports both CLI and Model Context Protocol (MCP) integration
- GitHub: gotalab/skillport

**Assessment**: Direct competitor with similar goals. Focuses on MCP integration as primary distribution mechanism, whereas Skillz focuses on file-based sync to multiple targets.

---

#### agentskills CLI

**Status**: ✅ Complete

**Details**:

- CLI for browsing and installing skills from anthropics/skills repository
- Makes it easy to discover and use pre-built skills
- GitHub: akshayaggarwal99/agentskills
- Focuses on skill discovery rather than multi-tool synchronization

**Assessment**: Complementary tool for skill discovery. Could potentially integrate with Skillz for installation workflow.

---

#### SyncAI

**Status**: ✅ Complete

**Details**:

- Creates single Rules.md file that syncs to all AI agent configuration files
- Uses symbolic links for synchronization
- "One source of truth for Claude, Copilot, Cursor & more"
- GitHub: nxnom/syncai

**Assessment**: Very similar to Skillz's core mission. Uses symlinks vs. Skillz's managed-section approach. Symlinks may be simpler but less flexible for per-target customization.

---

#### Claude Agents Sync

**Status**: ✅ Complete

**Details**:

- Automates synchronization of CLAUDE.md and AGENTS.md files
- Ensures AI assistant instructions stay consistent across tools
- GitHub: Genuscoronilladownquark935/claude-agents-sync
- Narrower scope than Skillz (only Claude/AGENTS.md)

**Assessment**: Addresses specific Claude Code + AGENTS.md pattern. Skillz provides broader multi-target, multi-format support.

---

#### Gemini CLI Skillz Extension

**Status**: ✅ Complete

**Details**:

- Gemini CLI extension for Anthropic-style Agent Skills
- Uses skillz MCP server to bring SKILL.md pattern to Gemini
- GitHub: intellectronica/gemini-cli-skillz
- Demonstrates cross-platform value of SKILL.md format

**Assessment**: Shows demand for skill format portability. Validates Skillz's approach of standardizing on SKILL.md.

---

#### MCP Prompt Registry

**Status**: ✅ Complete

**Details**:

- Lightweight, file-based Model Context Protocol (MCP) prompt server
- Prompts stored as simple JSON files for version control
- CLI tool for managing prompts with search, tags, and metadata
- GitHub: stevengonsalvez/promptregistry-mcp
- Runs via stdio for local development integration

**Assessment**: Solves related but different problem (prompt templates vs. agent skills). MCP integration is interesting alternative distribution mechanism.

---

### Broader Agentic CLI Tools (Not Skill-Focused)

#### Toad

**Status**: ✅ Complete

**Details**:

- Unified CLI front-end for multiple AI agent tools (December 2025 release)
- Supports 12+ agent CLIs including OpenHands, Claude Code, Gemini CLI
- Uses Agent Communication Protocol (ACP) to standardize communication
- Solves "CLI fragmentation" problem at a different layer

**Assessment**: Complementary to Skillz. Toad unifies agent invocation, Skillz unifies skill/instruction management.

---

#### LLM (Simon Willison)

**Status**: ✅ Complete

**Details**:

- General-purpose CLI for accessing LLMs from command line
- Version 0.26+ introduced tool-calling capabilities
- Plugin architecture for extensibility
- Not specifically focused on agent skills/instructions

**Assessment**: Different use case (direct LLM interaction vs. IDE assistant configuration).

---

### AI Coding Assistant Configuration Approaches

#### Claude Code Skills

**Status**: ✅ Complete

**Details**:

- Skills defined in `SKILL.md` files with YAML frontmatter
- Loaded from `.claude/skills/` directories (project) and `~/.claude/skills/` (user)
- Each skill is self-contained in its own directory
- Skills referenced in AGENTS.md via special syntax
- Official skills repository: anthropics/skills on GitHub
- Agent Skills is positioned as an "open standard" for portability

**Assessment**: Skillz directly addresses Claude Code's skill format as a primary use case. The SKILL.md format is becoming a de facto standard.

---

#### Cursor Rules

**Status**: ✅ Complete

**Details**:

- Uses `.cursor/rules/` directory for rule files
- Supports `.md` and `.mdc` (markdown with metadata) formats
- Rules can be project-specific or global
- `.cursorrules` file deprecated in favor of CLAUDE.md
- Can enable "Include CLAUDE.md in context" setting to read CLAUDE.md directly
- No native multi-tool sync mechanism

**Assessment**: Cursor users must manually maintain separate rule files, creating duplication risk. The shift to CLAUDE.md shows convergence toward standard file names.

---

#### Gemini CLI

**Status**: ✅ Complete

**Details**:

- Open-source AI agent from Google (recent release)
- Uses GEMINI.md for system prompts and configuration
- Built on emerging standards like MCP
- Supports both personal and team settings
- Extensible architecture

**Assessment**: Another major player adopting the `.md` configuration pattern. GEMINI.md vs CLAUDE.md shows need for multi-target sync tools like Skillz.

---

#### GitHub Copilot Agent Skills

**Status**: ✅ Complete

**Details**:

- Agent Skills support announced December 2025
- Works across Copilot coding agent, Copilot CLI, and VS Code Insiders
- Uses `.github/skills` directory
- Positioned as "open standard enabling portability"
- Compatible with Anthropic SKILL.md format

**Assessment**: Major validation of SKILL.md as emerging standard. GitHub adoption significantly increases Skillz's potential value proposition.

---

#### Aider

**Status**: ✅ Complete

**Details**:

- Configuration via `.aider.conf.yml` files
- Supports "read" and "architect" prompts
- Can specify custom system messages
- Limited reusability across projects
- Open-source with 135+ contributors

**Assessment**: Aider focuses on single-project configuration rather than cross-tool skill sharing. YAML config is different paradigm from markdown-based instructions.

---

### Current Developer Sync Approaches

#### Symlinks (Manual)

**Status**: ✅ Complete

**Details**:

- `ln -sf AGENTS.md CLAUDE.md` pattern
- AGENTS.md as canonical source, CLAUDE.md as link
- Works on Unix/Linux/Mac only
- Zero-copy, instant sync
- Popular manual solution documented in blog posts

**Assessment**: Simple and effective for single-direction sync, but brittle across platforms and doesn't support per-target customization.

---

#### Hard Links

**Status**: ✅ Complete

**Details**:

- Two filenames point to same physical file on disk
- Changes to either file instantly reflected
- VS Code extension exists for creating hard links
- More portable than symlinks but still filesystem-dependent

**Assessment**: Solves some symlink limitations but still one-size-fits-all approach.

---

#### Pointer Files

**Status**: ✅ Complete

**Details**:

- Keep canonical instructions in one file
- Other files contain "READ AGENTS.md FIRST!!!" message
- Manual maintenance required
- Prevents accidental divergence

**Assessment**: Low-tech solution that works but requires manual updates and doesn't provide true sync.

---

#### Manual Copy-Paste

**Status**: ✅ Complete

**Details**:

- Most common current approach based on forum discussions
- High risk of divergence between files
- No change tracking or version control
- Error-prone and time-consuming

**Assessment**: The problem Skillz solves. Manual sync is current painful reality for most developers.

---

### Adjacent Domain Patterns

#### GNU Stow

**Status**: ✅ Complete

**Details**:

- Symlink farm manager for dotfiles
- Stores configs in common location, links to home directory
- Package-based organization
- Doesn't integrate with version control
- No templating or encryption features
- Lightweight and simple

**Assessment**: Inspiration for file syncing patterns, but symlink-only approach too limited for multi-format LLM configs. Lack of templating means no per-target customization.

---

#### Chezmoi

**Status**: ✅ Complete

**Details**:

- Template-based dotfile manager
- Multi-machine configuration support
- Built-in secrets encryption
- Git integration for version control
- Machine-specific configurations via templates
- Comprehensive feature set for shell configs

**Assessment**: Templates and multi-target support are good patterns to emulate. However, focused on cross-machine sync rather than cross-tool format transformation.

---

#### Configuration Sync Tools (Syncthing, Mackup)

**Status**: ✅ Complete

**Details**:

- Cross-machine configuration synchronization
- Application-specific backup/restore
- Not designed for multi-format transformation
- Focus on file-level sync, not content transformation

**Assessment**: Solves different problem (cross-machine sync vs. cross-tool format adaptation). Skillz needs content transformation, not just file copying.

---

## Comparative Analysis

| Criteria                 | Skillz       | SyncAI | Skillport | Manual Symlinks | Dotfile Managers | MCP Prompt Registry |
| ------------------------ | ------------ | ------ | --------- | --------------- | ---------------- | ------------------- |
| Multi-tool support       | ✅           | ✅     | ✅        | Limited         | ❌               | Via MCP only        |
| Per-target templates     | ✅           | ❌     | ❓        | ❌              | ✅ (Chezmoi)     | ❌                  |
| Change detection         | ✅ (hashing) | ❌     | ❓        | Instant         | Varies           | ❓                  |
| CLI workflow             | ✅           | ✅     | ✅        | Manual          | ✅               | ✅                  |
| Cross-platform           | ✅           | ❓     | ✅        | Unix/Mac only   | ✅ (Chezmoi)     | ✅                  |
| Native mode support      | ✅           | ❌     | ❓        | N/A             | N/A              | N/A                 |
| SKILL.md format          | ✅           | ❓     | ✅        | ✅              | N/A              | ❌ (JSON)           |
| Watch mode               | 🔜 (planned) | ❓     | ❓        | N/A             | ✅ (Chezmoi)     | ❓                  |
| Version control friendly | ✅           | ✅     | ✅        | ✅              | ✅               | ✅                  |

**Strengths/Weaknesses Summary**:

- **Skillz**: Directory-based skill sync with change detection. TypeScript/Node.js stack. Still under active development.

- **SyncAI**: Simple symlink-based approach. Good for basic use cases. Limited flexibility - one file fits all targets. No per-target customization.

- **Skillport**: Focuses on MCP as distribution mechanism. Potentially more future-proof as MCP adoption grows. Less mature than file-based approaches. Requires MCP-compatible clients.

- **Manual Symlinks**: Zero dependencies, instant sync. Platform-limited (Unix/Mac). No customization. Works great for simple setups where all tools accept same format.

- **Dotfile Managers**: Mature tools with extensive features (Chezmoi). Not specialized for LLM use case. Templates are helpful pattern. Cross-machine focus vs. cross-tool focus.

- **MCP Prompt Registry**: Leverages Model Context Protocol. Different paradigm (prompt templates vs. agent skills). JSON format vs. markdown. Good for programmatic access.

---

## Best Practices

From analyzing existing tools and approaches, these patterns emerge:

1. **Single Source of Truth**: Maintain skills/prompts in one canonical location (e.g., `.claude/skills/`), sync to targets. Prevents divergence and reduces maintenance burden. Both Skillz and SyncAI adopt this pattern.

2. **Atomic File Operations**: Use temp file + rename pattern to prevent corruption during sync. Skillz implements this via `safeWriteFile()` utility. Critical for CLI tools that may be interrupted.

3. **Change Detection via Hashing**: Compare content hashes rather than timestamps to detect real changes. Skillz uses SHA-256 hashing. Avoids unnecessary syncs and provides reliable change tracking.

4. **Directory-Based Sync**: Copy self-contained skill directories into predictable targets. This keeps source material inspectable and avoids generated rule-file drift.

5. **Version Control Friendly**: Generate predictable directory trees that are easy to diff. All tools in this space prioritize git-friendliness.

6. **Avoid Partial Writes**: Validate all target conflicts before copying so failed syncs do not leave half-updated target trees.

7. **Fail Fast on Conflicts**: Validate all targets before making any changes. Prevents partial sync states that are hard to recover from.

8. **Standard File Formats**: Prefer markdown with YAML frontmatter for human readability and tool compatibility. SKILL.md format gaining adoption across Claude Code, GitHub Copilot, and Gemini extensions.

---

## Open Research Questions

1. **MCP Adoption Timeline**: How quickly will Model Context Protocol become the dominant distribution mechanism? Should Skillz add MCP server support?

2. **Enterprise Prompt Management**: How do larger teams handle prompt versioning, approval workflows, and multi-environment deployments? Is there a gap for enterprise features?

3. **Skills Discovery**: Beyond sync, how do developers find and evaluate quality skills? Is there opportunity for a skills marketplace or rating system? (agentskills CLI addresses this partially)

4. **Performance at Scale**: How do these tools perform with 50+ skills across 10+ targets? Need benchmarking data.

5. **IDE Integration**: Should skill management be IDE extensions vs. CLI tools? Cursor and VS Code support suggests IDE integration matters.

6. **Cross-Team Sharing**: What patterns exist for sharing organizational skills across projects? Private skill registries? Monorepo patterns?

7. **Skill Composition**: Should skills be able to reference other skills? How to handle dependencies?

---

## Recommendations

### Summary

**Skillz occupies a valuable niche in the emerging LLM tooling ecosystem.** The research validates that:

1. The multi-tool sync problem is real and painful (manual copy-paste is most common approach)
2. SKILL.md format is becoming a de facto standard (Anthropic, GitHub, community adoption)
3. Existing solutions are either too simple (symlinks) or solve different problems (MCP, dotfiles)
4. Skillz's differentiation (filesystem skill sync + change detection) addresses unmet needs

### Recommended Approach

**Continue development of Skillz with these strategic priorities:**

**1. Complete Core MVP (Target: Q1 2025)**

- Finish remaining commands: `validate`, `config`, `watch`, `clean`
- Solidify testing coverage and documentation
- Release v1.0 with current feature set

**2. MCP Integration (Target: Q2 2025)**

- Add optional MCP server mode alongside file-based sync
- Position Skillz as hybrid solution: file-based for immediate compatibility, MCP for future-proofing
- Monitor MCP adoption trajectory (OpenAI, Google confirmed support)

**3. Skills Discovery Integration**

- Consider integration with anthropics/skills repository
- Evaluate partnership/integration with agentskills CLI for installation workflow
- Add `skillz install <skill-name>` command to fetch from registry

**4. Enterprise Features (If Market Demand)**

- Team collaboration features (shared skill repositories)
- Approval workflows for skill changes
- Multi-environment support (dev/staging/prod skill sets)

**Rationale**:

- **Market Timing**: GitHub Copilot Agent Skills announcement (Dec 2025) validates SKILL.md standard at critical moment. First-mover advantage window still open.

- **Differentiation Holds**: Filesystem skill sync plus change detection remains useful. SyncAI and Skillport do not focus on copied skill-directory targets.

- **Hedge Against MCP**: File-based sync provides immediate value while MCP ecosystem matures. Hybrid approach captures both markets.

- **Low Competition Risk**: Most tools in this space are side projects or narrowly scoped. Quality execution with good docs can establish Skillz as category leader.

### Alternative Approaches

**If resources are limited, consider:**

1. **Minimum Viable Product Focus**: Ship v1.0 with just `init`, `sync`, `list`, `create`. Defer `validate`, `config`, `watch`, `clean` to v1.1+ based on user feedback.

2. **MCP-First Strategy**: Pivot to pure MCP server implementation, abandon file-sync approach. Riskier but potentially more future-proof. Requires MCP ecosystem to mature quickly.

3. **Collaboration Over Competition**: Reach out to SyncAI and Skillport maintainers to explore collaboration or merger. Consolidate efforts to build stronger tool together.

4. **IDE Extension Path**: Build VS Code extension instead of CLI. Captures more users but higher development cost and platform lock-in.

---

## References

### CLI Tools and Frameworks

- [Toad - Unified CLI for AI Agents](https://www.infoq.com/news/2025/12/llm-agent-cli/)
- [LLM by Simon Willison](https://github.com/simonw/llm)
- [Skillport - GitHub](https://github.com/gotalab/skillport)
- [agentskills CLI - GitHub](https://github.com/akshayaggarwal99/agentskills)
- [SyncAI - GitHub](https://github.com/nxnom/syncai)
- [Claude Agents Sync - GitHub](https://github.com/Genuscoronilladownquark935/claude-agents-sync)
- [Gemini CLI Skillz Extension - GitHub](https://github.com/intellectronica/gemini-cli-skillz)
- [MCP Prompt Registry - GitHub](https://github.com/stevengonsalvez/promptregistry-mcp)

### AI Coding Assistants

- [Claude Code Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Anthropic Skills Repository - GitHub](https://github.com/anthropics/skills)
- [GitHub Copilot Agent Skills - Documentation](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
- [GitHub Copilot Agent Skills - Changelog](https://github.blog/changelog/2025-12-18-github-copilot-now-supports-agent-skills/)
- [Agentic CLI Tools Compared](https://research.aimultiple.com/agentic-cli/)
- [Compare Top 5 Agentic CLI Tools](https://getstream.io/blog/agentic-cli-tools/)

### Sync Approaches and Patterns

- [Keeping Claude Code, Codex, and Cursor in Sync](https://coding-with-ai.dev/posts/sync-claude-code-codex-cursor-memory/)
- [Aligning Team with Cursor, Claude, etc.](https://www.concret.io/blog/sync-coding-standards-across-cursor-agentforce-vibes-claude)

### Model Context Protocol (MCP)

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts)
- [Anthropic Introduces MCP](https://www.anthropic.com/news/model-context-protocol)
- [MCP One Year Anniversary](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/)
- [MCP Servers - GitHub](https://github.com/modelcontextprotocol/servers)
- [Best MCP Servers in 2025](https://www.pomerium.com/blog/best-model-context-protocol-mcp-servers-in-2025)

### Dotfile Managers

- [Chezmoi Documentation](https://www.chezmoi.io/)
- [Why Use Chezmoi](https://www.chezmoi.io/why-use-chezmoi/)
- [Managing Dotfiles with Chezmoi](https://natelandau.com/managing-dotfiles-with-chezmoi/)
- [Dotfile Management with GNU Stow](https://www.tusharchauhan.com/writing/dotfile-management-using-gnu-stow/)
- [Dotfiles Utilities Overview](https://dotfiles.github.io/utilities/)

### Prompt Management Platforms

- [Top 5 AI Prompt Management Tools 2025](https://arize.com/blog/top-5-ai-prompt-management-tools-of-2025/)
- [Prompt Management Systems Compared](https://nearform.com/digital-community/prompt-management-systems-compared/)
- [PromptLayer Documentation](https://www.promptlayer.com/)
- [Stop Losing Prompts - Build MCP Prompt Registry](https://dev.to/stevengonsalvez/stop-losing-prompts-build-your-own-mcp-prompt-registry-4fi1)

---

## Appendices

### Appendix A: Directory Structure Patterns

**Claude Code:**

```
.claude/
└── skills/
    ├── python-expert/
    │   └── SKILL.md
    └── react-patterns/
        └── SKILL.md
```

**GitHub Copilot:**

```
.github/
└── skills/
    ├── testing-skill/
    │   └── SKILL.md
    └── api-design/
        └── SKILL.md
```

**Gemini CLI:**

```
.gemini/
└── skills/
    └── [similar structure]
```

**Cursor:**

```
.cursor/
└── rules/
    ├── skill-1.mdc
    └── skill-2.md
```

### Appendix B: File Naming Conventions

| Tool           | Project Config  | User Config         | Skills Location |
| -------------- | --------------- | ------------------- | --------------- |
| Claude Code    | CLAUDE.md       | ~/.claude/CLAUDE.md | .claude/skills/ |
| Cursor         | CLAUDE.md       | N/A                 | .cursor/rules/  |
| Gemini CLI     | GEMINI.md       | ~/.gemini/GEMINI.md | Various         |
| GitHub Copilot | AGENTS.md (?)   | N/A                 | .github/skills/ |
| Aider          | .aider.conf.yml | ~/.aider.conf.yml   | N/A             |

**Observations:**

- CLAUDE.md emerging as common project-level config file
- AGENTS.md also widely used (originally from Claude ecosystem)
- `.md` extension standard for configuration files
- Skills directories follow `.[tool]/skills/` pattern

### Appendix C: Sync Approach Comparison

**Symlink Approach (Manual):**

```bash
# Create AGENTS.md as source of truth
echo "# Instructions" > AGENTS.md

# Link CLAUDE.md to it
ln -sf AGENTS.md CLAUDE.md

# Link GEMINI.md
ln -sf AGENTS.md GEMINI.md
```

**Pros:** Instant sync, zero dependencies
**Cons:** Platform-specific, all files identical (no customization)

**Skillz Approach (Filesystem Skills):**

```bash
# Initialize configuration
skillz init --preset agentsmd

# Skills stay in canonical location
.claude/skills/python-expert/SKILL.md

# Sync copies skills to target directories
skillz sync

# .skills/python-expert/SKILL.md is copied into the target tree
```

**Pros:** Cross-platform, version-controlled, direct skill filesystem layout
**Cons:** Requires build step (not instant sync)

**MCP Approach (Skillport/Prompt Registry):**

```bash
# Skills served via MCP protocol
# Clients connect to MCP server
# No file sync needed

# Start MCP server
skillport serve

# Clients use MCP to access skills
```

**Pros:** Dynamic, no file duplication, programmatic access
**Cons:** Requires MCP-compatible clients, more complex setup

### Appendix D: Market Segmentation

**Current Pain Points by User Segment:**

1. **Solo Developers (Hobbyists)**
   - Pain: Copying skills between Claude Code and Cursor manually
   - Current Solution: Symlinks or manual copy-paste
   - Skillz Value: Low (manual methods work okay)

2. **Professional Developers (Individual Contributors)**
   - Pain: Managing skills across 3-5 tools, multiple projects
   - Current Solution: Manual sync, often outdated/divergent
   - Skillz Value: High (productivity gain, fewer errors)

3. **Engineering Teams (5-50 people)**
   - Pain: Sharing organizational skills, keeping team in sync
   - Current Solution: Copy-paste from shared docs, wiki
   - Skillz Value: Very High (consistency, onboarding)

4. **Enterprise (50+ developers)**
   - Pain: Governance, approval workflows, multi-environment
   - Current Solution: Custom tooling or manual processes
   - Skillz Value: Medium (needs enterprise features not yet built)

**Target Segment:** Professional developers and small-to-medium engineering teams (segments 2-3) represent the sweet spot for current Skillz feature set.

### Appendix E: Technology Stack Comparison

| Tool           | Language      | Package Manager | Distribution | Stars (approx) |
| -------------- | ------------- | --------------- | ------------ | -------------- |
| Skillz         | TypeScript    | npm             | npm, binary  | N/A (new)      |
| SyncAI         | ?             | ?               | GitHub       | ~100-500 (est) |
| Skillport      | Go (likely)   | go              | ?            | <100 (est)     |
| agentskills    | TypeScript/JS | npm             | npm          | <100 (est)     |
| Chezmoi        | Go            | go              | brew, binary | 12.5k+         |
| LLM (Willison) | Python        | pip             | pip, brew    | 4k+            |

**Observations:**

- TypeScript/Node.js common for LLM tooling (good ecosystem)
- Go popular for system tools (Chezmoi, likely Skillport)
- Distribution via package managers + standalone binaries is standard
