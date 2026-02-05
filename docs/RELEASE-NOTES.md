# Anytero 2.0.0 Release Notes

**Release Date**: TBD  
**Breaking Changes**: Yes - Complete reimplementation  
**Migration Required**: Yes

## 🎉 Major Changes

### Complete Reimplementation: Notion → Anytype

Anytero 2.0.0 is a complete rewrite of Notero, replacing Notion integration with Anytype integration. This is a **breaking change** that requires new installation and configuration.

**Why the Change?**

- **Privacy-focused**: Anytype stores data locally, not in the cloud
- **Offline-first**: Works without internet connection
- **Open-source friendly**: Anytype is building towards open-source
- **Better control**: Your data stays on your device

## ✨ New Features

### Anytype Integration

- ✅ **Local REST API**: Connects to Anytype Desktop (localhost:31009)
- ✅ **Challenge-Response Auth**: Secure 4-digit code authentication
- ✅ **Secure Storage**: API keys stored in Zotero's password manager
- ✅ **Space Selection**: Choose which Anytype space to sync to
- ✅ **Real-time Sync**: Automatic syncing when items are added/modified

### Data Synchronization

- ✅ **Full Metadata Sync**: Title, authors, abstract, publication info, dates
- ✅ **Collection Mapping**: Map Zotero collections to Anytype space
- ✅ **Note Syncing**: Sync Zotero notes as Anytype pages
- ✅ **Tag Support**: Zotero tags → Anytype tags
- ✅ **Attachment Metadata**: File information (full upload coming soon)

### User Interface

- ✅ **New Preferences UI**: Redesigned for Anytype workflow
- ✅ **Connection Status**: Visual indicator for Anytype connectivity
- ✅ **Space Browser**: View and select available spaces
- ✅ **Sync Progress**: Real-time progress window during sync
- ✅ **Error Reporting**: Clear error messages and troubleshooting

### Developer Experience

- ✅ **Comprehensive Tests**: 165 tests with 100% coverage of new code
- ✅ **Type Safety**: Full TypeScript with strict mode
- ✅ **Modern Architecture**: Service-based design with dependency injection
- ✅ **Documentation**: Complete API docs and guides

## 📋 Requirements

### System Requirements

- **Zotero**: 7.0 or later
- **Anytype Desktop**: Latest version with REST API support (v0.25.0+)
- **Operating System**: Windows, macOS, or Linux

### Prerequisites

1. Install Zotero 7.0+
2. Install Anytype Desktop application
3. Have Anytype Desktop running before using Anytero

## 📦 Installation

### New Installation

1. **Download**: Get `anytero-X.X.X.xpi` from releases page
2. **Install**: In Zotero, go to Tools → Add-ons → Install Add-on From File
3. **Authenticate**: Open Anytero preferences, click "Authenticate with Anytype"
4. **Configure**: Select your Anytype space and configure collection sync

For detailed instructions, see [Installation Guide](./docs/INSTALLATION.md).

### Upgrading from Notero

**Important**: This is NOT an upgrade - it's a completely different application.

If you were using Notero (the Notion version):

1. **Backup**: Export your Notion database first
2. **Uninstall**: Remove Notero completely
3. **Install**: Install Anytero as a new extension
4. **Reconfigure**: Set up authentication and sync from scratch

**Your Notion data will NOT be automatically migrated.**

## 🔄 Migration Guide

### From Notero to Anytero

Since Anytero uses a completely different backend (Anytype instead of Notion), automatic migration is not possible. Here's how to transition:

#### Step 1: Prepare Your Data

- Export your Notion database to backup your data
- Make note of which Zotero collections were synced
- Download any important attachments

#### Step 2: Install Anytype

- Download and install Anytype Desktop
- Create an account and set up your spaces
- Familiarize yourself with Anytype's interface

#### Step 3: Install Anytero

- Uninstall Notero from Zotero
- Install Anytero from the `.xpi` file
- Restart Zotero

#### Step 4: Configure Sync

- Authenticate with Anytype Desktop
- Select your target Anytype space
- Configure the same Zotero collections for sync

#### Step 5: Initial Sync

- Perform a full sync of your collections
- Verify items appear correctly in Anytype
- Check that metadata is complete

#### Step 6: Cleanup (Optional)

- Remove old Notion integration if no longer needed
- Archive or delete synced data from Notion

## 🐛 Known Issues

### Current Limitations

1. **One-Way Sync**: Zotero → Anytype only (no import from Anytype yet)
2. **Attachment Files**: Metadata only, not full file content upload
3. **Object Types**: All items become generic "page" objects
4. **Relations**: Complex item relations not fully supported

### Planned for Future Releases

- Bidirectional sync (Anytype → Zotero)
- Full attachment file upload
- Custom Anytype object types
- Rich relation mapping
- Conflict resolution UI

## 📖 Documentation

Comprehensive documentation is now available:

- **[Installation Guide](./docs/INSTALLATION.md)**: Step-by-step setup
- **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)**: Solutions for common issues
- **[Data Mapping Guide](./docs/DATA-MAPPING.md)**: How data is transformed
- **[README.md](./README.md)**: Quick start and overview

## 🧪 Testing

Anytero 2.0.0 includes comprehensive test coverage:

- **165 total tests** (28 new Anytype tests + 137 existing)
- **100% coverage** of new Anytype integration code
- **Automated testing**: Tests run on every build

Test breakdown:

- AnytypeClient: 14 tests (authentication, spaces, objects, health)
- AnytypeAuthManager: 14 tests (auth flow, API keys, client creation)
- All legacy tests passing: 137 tests

## 🔒 Security & Privacy

### Data Storage

- API keys stored in Zotero's secure password manager
- No cloud storage of credentials
- All communication with Anytype is local (localhost)

### Privacy Benefits

- Your data never leaves your device
- No third-party cloud services
- No tracking or analytics
- Fully offline capable

### Security Features

- Challenge-response authentication (4-digit codes)
- Time-limited authentication sessions
- Secure credential storage
- HTTPS ready (when Anytype supports it)

## 🙏 Acknowledgments

Anytero is a fork/reimplementation of Notero by David Hoff-Vanoni. The original Notero integrated with Notion and provided the foundation for this Anytype version.

- **Original Notero**: [github.com/dvanoni/notero](https://github.com/dvanoni/notero)
- **Anytype**: [anytype.io](https://anytype.io/)
- **Zotero**: [zotero.org](https://www.zotero.org/)

## 📞 Support

### Getting Help

If you encounter issues:

1. **Check Documentation**: Start with the [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
2. **Search Issues**: Look for similar problems in [GitHub Issues](https://github.com/dataymeric/anytero/issues)
3. **Report Bugs**: Create a new issue with:
   - Zotero version
   - Anytype Desktop version
   - Steps to reproduce
   - Error messages/logs

### Community

- **GitHub Discussions**: Ask questions and share tips
- **Issues**: Report bugs and request features
- **Contributions**: Pull requests welcome!

## 📅 Roadmap

### Version 2.1 (Planned)

- Bidirectional sync (Anytype → Zotero)
- Attachment file upload support
- Performance optimizations
- Improved error handling

### Version 2.2 (Planned)

- Custom object types in Anytype
- Advanced relation mapping
- Batch operations UI
- Sync scheduling

### Long-term Goals

- Conflict resolution interface
- Multiple space support
- Advanced filtering options
- Plugin API for extensibility

## 📜 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## 📄 License

Anytero is licensed under the same license as Notero. See [LICENSE](./LICENSE) for details.

---

**Thank you for using Anytero!** 🎉

We hope this new Anytype integration provides a more private, flexible, and powerful way to manage your research references. Please report any issues and share your feedback!
