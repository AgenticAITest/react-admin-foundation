# Documentation Index

This folder contains all documentation for the Business Foundation system, organized by purpose and audience.

## Folder Structure

### `/ai-coding-guides/`
**Purpose**: Guidelines for AI coding assistants when working with foundation components  
**Audience**: AI assistants (Replit, Vercel, etc.) during module development  

Contains detailed usage patterns and examples for:
- `AUTHORIZED_COMPONENT_USAGE.md` - Authorization component patterns
- `BREADCRUMBS_USAGE.md` - Navigation breadcrumb implementation
- `CONFIRMDIALOG_USAGE.md` - Confirmation dialog patterns
- `DATAPAGINATION_USAGE.md` - Data pagination patterns
- `ERROR_BOUNDARY_DOCS.md` - Error handling implementation
- `SORTBUTTON_USAGE.md` - Sorting functionality patterns
- `TREEVIEW_USAGE.md` - Tree view component usage

### `/system-architecture/`
**Purpose**: High-level system design and development workflow documentation  
**Audience**: System architects, super admins, and business analysts  

Contains:
- `plugin-system-design.md` - Complete plugin architecture design
- `module-development-workflow.md` - Step-by-step development and deployment process

## Usage Guidelines

### For Business Analysts Developing Modules:
1. Start with `/system-architecture/module-development-workflow.md` for the complete process
2. Reference `/ai-coding-guides/` when working with AI assistants on specific components
3. Follow the plugin architecture described in `/system-architecture/plugin-system-design.md`

### For AI Coding Assistants:
1. Always consult `/ai-coding-guides/` for component-specific implementation patterns
2. Follow the architectural patterns outlined in `/system-architecture/`
3. Ensure all new modules follow the established conventions

### For System Administrators:
1. Review `/system-architecture/` for understanding system design and deployment processes
2. Use the workflow documentation for managing module integration and deployment

## Document Maintenance

- **AI Coding Guides**: Update when foundation components change or new patterns emerge
- **System Architecture**: Update when architectural decisions change or new features are added
- **This README**: Update when folder structure or document purposes change

## Quick Links

### Getting Started with Module Development:
→ [Module Development Workflow](system-architecture/module-development-workflow.md)

### Understanding the System Architecture:
→ [Plugin System Design](system-architecture/plugin-system-design.md)

### Component Usage for AI Assistants:
→ [AI Coding Guides Directory](ai-coding-guides/)