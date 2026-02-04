# Privacy Policy

Last updated: February 4, 2026

The Anytero plugin primarily interacts with the user's local Zotero client and
the Anytype local API. This document describes the data that the plugin accesses
and how it is used.

## Anytype Authorization

The Anytero plugin uses a challenge-response authentication mechanism to connect
to the Anytype Desktop application running on the user's local computer. This
authentication happens entirely locally and does not involve any external servers.

The authentication process works as follows:
1. Anytero initiates an authentication challenge with the local Anytype API
2. A 4-digit code is generated and displayed to the user
3. The user enters this code in Anytype Desktop to authorize the connection
4. Upon successful verification, an API key is generated and stored securely

The API key is securely stored using the [Zotero login manager][]. Data stored
with the login manager is encrypted and stored on the user's local computer
within the [Zotero profile directory][].

## Local-Only Communication

Unlike Notion-based solutions, Anytero communicates exclusively with the Anytype
Desktop application running locally on the user's computer at `http://localhost:31009`.
No data is transmitted to external servers or cloud services through Anytero.

## User Data

The Anytero plugin stores user-specific data, including Anytype space IDs and
object IDs, on the user's local computer within the [Zotero profile directory][].
These values are used only for local synchronization with Anytype and are not
transmitted anywhere else.

As part of the synchronization process, user-generated Zotero item data may be
synced to Anytype. These may include but are not limited to notes, tags, and
custom fields. Data saved in Anytype is stored locally on the user's computer
and is subject to [Anytype terms and privacy][].

The Anytero plugin does not communicate with any external services. All data
remains on the user's local computer.

[Anytype terms and privacy]: https://anytype.io/privacy
[Zotero login manager]: https://udn.realityripple.com/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsILoginManager/Using_nsILoginManager
[Zotero profile directory]: https://www.zotero.org/support/kb/profile_directory
