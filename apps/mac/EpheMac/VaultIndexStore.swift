import Foundation
import SQLite3

enum VaultIndexStoreError: Error {
    case openFailed(String)
    case prepareFailed(String)
    case stepFailed(String)
}

actor VaultIndexStore {
    private let databaseURL: URL
    private var database: OpaquePointer?

    init(databaseURL: URL) {
        self.databaseURL = databaseURL
    }

    static func defaultDatabaseURL(for vault: Vault, fileManager: FileManager = .default) throws -> URL {
        let supportURL = try fileManager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let root = vault.rootURL.path(percentEncoded: false)
        let fingerprint = String(format: "%08x", root.stableFNV1a32)
        let directory = supportURL.appending(path: "Ephe/Indexes/\(fingerprint)", directoryHint: .isDirectory)
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appending(path: "vault.sqlite")
    }

    func open() throws {
        guard database == nil else { return }
        try FileManager.default.createDirectory(at: databaseURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        var handle: OpaquePointer?
        let flags = SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX
        guard sqlite3_open_v2(databaseURL.path(percentEncoded: false), &handle, flags, nil) == SQLITE_OK, let handle else {
            throw VaultIndexStoreError.openFailed(String(cString: sqlite3_errmsg(handle)))
        }
        database = handle
        try execute("PRAGMA journal_mode=WAL;")
        try execute("PRAGMA synchronous=NORMAL;")
        try execute("PRAGMA foreign_keys=ON;")
        try execute("PRAGMA temp_store=MEMORY;")
        try execute("PRAGMA cache_size=-20000;")
        try migrate()
    }

    func close() {
        if let database {
            sqlite3_close(database)
        }
        database = nil
    }

    func upsert(_ note: NoteIndex) throws {
        try open()
        try transaction {
            try execute(
                """
                INSERT INTO notes(path, title, modified_at, size, searchable_text)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(path) DO UPDATE SET
                    title = excluded.title,
                    modified_at = excluded.modified_at,
                    size = excluded.size,
                    searchable_text = excluded.searchable_text
                """,
                [
                    .text(note.id.rawValue),
                    .text(note.title),
                    .double(note.modifiedAt.timeIntervalSince1970),
                    .int(note.size),
                    .text(note.searchableText),
                ]
            )
            try execute("DELETE FROM headings WHERE note_path = ?", [.text(note.id.rawValue)])
            try execute("DELETE FROM links WHERE source_path = ?", [.text(note.id.rawValue)])
            try execute("DELETE FROM tags WHERE note_path = ?", [.text(note.id.rawValue)])
            try execute("DELETE FROM search_index WHERE path = ?", [.text(note.id.rawValue)])

            for heading in note.headings {
                try execute(
                    "INSERT INTO headings(note_path, level, text, line) VALUES (?, ?, ?, ?)",
                    [.text(note.id.rawValue), .int(Int64(heading.level)), .text(heading.text), .int(Int64(heading.line))]
                )
            }

            for link in note.links {
                try execute(
                    """
                    INSERT INTO links(source_path, kind, target, heading, alias, lower_bound, upper_bound, resolved_path)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [
                        .text(note.id.rawValue),
                        .text(link.kind.rawValue),
                        .text(link.target),
                        .nullableText(link.heading),
                        .nullableText(link.alias),
                        .int(Int64(link.range.lowerBound)),
                        .int(Int64(link.range.upperBound)),
                        .nullableText(resolve(link, from: note.id)),
                    ]
                )
            }

            for tag in note.tags {
                try execute(
                    "INSERT INTO tags(note_path, name, lower_bound, upper_bound) VALUES (?, ?, ?, ?)",
                    [.text(note.id.rawValue), .text(tag.name), .int(Int64(tag.range.lowerBound)), .int(Int64(tag.range.upperBound))]
                )
            }

            try execute(
                "INSERT INTO search_index(path, title, body) VALUES (?, ?, ?)",
                [.text(note.id.rawValue), .text(note.title), .text(note.searchableText)]
            )
            try refreshResolvedLinks()
        }
    }

    func remove(noteID: NoteID) throws {
        try open()
        try transaction {
            try execute("DELETE FROM notes WHERE path = ?", [.text(noteID.rawValue)])
            try refreshResolvedLinks()
        }
    }

    func replaceAll(with notes: [NoteIndex]) throws {
        try open()
        try transaction {
            try execute("DELETE FROM search_index")
            try execute("DELETE FROM tags")
            try execute("DELETE FROM links")
            try execute("DELETE FROM headings")
            try execute("DELETE FROM notes")
            for note in notes {
                try execute(
                    "INSERT INTO notes(path, title, modified_at, size, searchable_text) VALUES (?, ?, ?, ?, ?)",
                    [
                        .text(note.id.rawValue),
                        .text(note.title),
                        .double(note.modifiedAt.timeIntervalSince1970),
                        .int(note.size),
                        .text(note.searchableText),
                    ]
                )
                for heading in note.headings {
                    try execute(
                        "INSERT INTO headings(note_path, level, text, line) VALUES (?, ?, ?, ?)",
                        [.text(note.id.rawValue), .int(Int64(heading.level)), .text(heading.text), .int(Int64(heading.line))]
                    )
                }
                for link in note.links {
                    try execute(
                        """
                        INSERT INTO links(source_path, kind, target, heading, alias, lower_bound, upper_bound, resolved_path)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        [
                            .text(note.id.rawValue),
                            .text(link.kind.rawValue),
                            .text(link.target),
                            .nullableText(link.heading),
                            .nullableText(link.alias),
                            .int(Int64(link.range.lowerBound)),
                            .int(Int64(link.range.upperBound)),
                            .nullableText(resolve(link, from: note.id)),
                        ]
                    )
                }
                for tag in note.tags {
                    try execute(
                        "INSERT INTO tags(note_path, name, lower_bound, upper_bound) VALUES (?, ?, ?, ?)",
                        [.text(note.id.rawValue), .text(tag.name), .int(Int64(tag.range.lowerBound)), .int(Int64(tag.range.upperBound))]
                    )
                }
                try execute(
                    "INSERT INTO search_index(path, title, body) VALUES (?, ?, ?)",
                    [.text(note.id.rawValue), .text(note.title), .text(note.searchableText)]
                )
            }
            try refreshResolvedLinks()
        }
    }

    func backlinks(to noteID: NoteID) throws -> [Backlink] {
        try open()
        return try query(
            """
            SELECT source_path, target, heading, alias, lower_bound, upper_bound
            FROM links
            WHERE resolved_path = ?
            ORDER BY source_path
            """,
            [.text(noteID.rawValue)]
        ) { statement in
            Backlink(
                source: NoteID(indexedPath: columnText(statement, 0)),
                link: WikiLink(
                    target: columnText(statement, 1),
                    heading: columnOptionalText(statement, 2),
                    alias: columnOptionalText(statement, 3),
                    sourceRange: TextRange(
                        lowerBound: Int(sqlite3_column_int64(statement, 4)),
                        upperBound: Int(sqlite3_column_int64(statement, 5))
                    )
                )
            )
        }
    }

    func search(_ queryText: String, limit: Int = 80) throws -> [NoteIndexEntry] {
        try open()
        let trimmed = queryText.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return try allNotes()
        }

        let escaped = trimmed
            .split(whereSeparator: \.isWhitespace)
            .map { "\"\($0.replacingOccurrences(of: "\"", with: "\"\""))\"*" }
            .joined(separator: " ")

        return try query(
            """
            SELECT notes.path, notes.title, notes.modified_at, notes.searchable_text
            FROM search_index
            JOIN notes ON notes.path = search_index.path
            WHERE search_index MATCH ?
            ORDER BY rank
            LIMIT ?
            """,
            [.text(escaped), .int(Int64(limit))]
        ) { statement in
            NoteIndexEntry(
                id: NoteID(indexedPath: columnText(statement, 0)),
                title: columnText(statement, 1),
                modifiedAt: Date(timeIntervalSince1970: sqlite3_column_double(statement, 2)),
                headings: [],
                outgoingLinks: [],
                searchableText: columnText(statement, 3)
            )
        }
    }

    func allNotes() throws -> [NoteIndexEntry] {
        try open()
        return try withStatement("SELECT path, title, modified_at FROM notes ORDER BY path", []) { statement in
            var rows: [NoteIndexEntry] = []
            rows.reserveCapacity(8_192)
            while true {
                let result = sqlite3_step(statement)
                if result == SQLITE_ROW {
                    rows.append(
                        NoteIndexEntry(
                            id: NoteID(indexedPath: columnText(statement, 0)),
                            title: columnText(statement, 1),
                            modifiedAt: Date(timeIntervalSince1970: sqlite3_column_double(statement, 2)),
                            headings: [],
                            outgoingLinks: [],
                            searchableText: ""
                        )
                    )
                } else if result == SQLITE_DONE {
                    return rows
                } else {
                    throw VaultIndexStoreError.stepFailed(errorMessage)
                }
            }
        }
    }

    func noteMetadata() throws -> [NoteID: NoteIndexMetadata] {
        try open()
        return try query(
            "SELECT path, modified_at, size FROM notes",
            []
        ) { statement in
            let id = NoteID(indexedPath: columnText(statement, 0))
            return NoteIndexMetadata(
                id: id,
                modifiedAt: Date(timeIntervalSince1970: sqlite3_column_double(statement, 1)),
                size: sqlite3_column_int64(statement, 2)
            )
        }
        .reduce(into: [NoteID: NoteIndexMetadata]()) { result, metadata in
            result[metadata.id] = metadata
        }
    }

    private func migrate() throws {
        let version = try userVersion()
        guard version < 1 else { return }
        try transaction {
            try execute(
                """
                CREATE TABLE IF NOT EXISTS notes (
                    path TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL,
                    modified_at REAL NOT NULL,
                    size INTEGER NOT NULL,
                    searchable_text TEXT NOT NULL
                );
                """
            )
            try execute(
                """
                CREATE TABLE IF NOT EXISTS headings (
                    note_path TEXT NOT NULL,
                    level INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    line INTEGER NOT NULL,
                    FOREIGN KEY(note_path) REFERENCES notes(path) ON DELETE CASCADE
                );
                """
            )
            try execute(
                """
                CREATE TABLE IF NOT EXISTS links (
                    source_path TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    target TEXT NOT NULL,
                    heading TEXT,
                    alias TEXT,
                    lower_bound INTEGER NOT NULL,
                    upper_bound INTEGER NOT NULL,
                    resolved_path TEXT,
                    FOREIGN KEY(source_path) REFERENCES notes(path) ON DELETE CASCADE
                );
                """
            )
            try execute("CREATE INDEX IF NOT EXISTS links_resolved_path_index ON links(resolved_path);")
            try execute("CREATE INDEX IF NOT EXISTS links_source_path_index ON links(source_path);")
            try execute(
                """
                CREATE TABLE IF NOT EXISTS tags (
                    note_path TEXT NOT NULL,
                    name TEXT NOT NULL,
                    lower_bound INTEGER NOT NULL,
                    upper_bound INTEGER NOT NULL,
                    FOREIGN KEY(note_path) REFERENCES notes(path) ON DELETE CASCADE
                );
                """
            )
            try execute("CREATE INDEX IF NOT EXISTS tags_name_index ON tags(name);")
            try execute("CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(path UNINDEXED, title, body);")
            try execute("PRAGMA user_version = 1;")
        }
    }

    private func resolve(_ link: ExtractedLink, from source: NoteID) throws -> String? {
        guard link.kind == .wiki || link.kind == .embed else { return nil }
        let sourceFolder = source.rawValue.split(separator: "/").dropLast().joined(separator: "/")
        let target = link.target.trimmingCharacters(in: .whitespacesAndNewlines)
        let relativeTarget = sourceFolder.isEmpty || target.contains("/")
            ? target
            : "\(sourceFolder)/\(target)"
        let exactID = NoteID(relativeTarget)
        if try noteExists(exactID) {
            return exactID.rawValue
        }
        let basename = URL(fileURLWithPath: target.lowercased().hasSuffix(".md") ? target : "\(target).md")
            .deletingPathExtension()
            .lastPathComponent
        let candidates = try query("SELECT path FROM notes WHERE title = ? ORDER BY path LIMIT 2", [.text(basename)]) { statement in
            columnText(statement, 0)
        }
        return candidates.count == 1 ? candidates[0] : nil
    }

    private func refreshResolvedLinks() throws {
        let links = try query(
            "SELECT rowid, source_path, kind, target FROM links WHERE kind IN ('wiki', 'embed')",
            []
        ) { statement in
            (
                rowID: sqlite3_column_int64(statement, 0),
                source: NoteID(indexedPath: columnText(statement, 1)),
                kind: columnText(statement, 2),
                target: columnText(statement, 3)
            )
        }
        for link in links {
            let kind = ExtractedLinkKind(rawValue: link.kind) ?? .wiki
            let resolved = try resolve(ExtractedLink(kind: kind, target: link.target, heading: nil, alias: nil, range: TextRange(lowerBound: 0, upperBound: 0)), from: link.source)
            try execute("UPDATE links SET resolved_path = ? WHERE rowid = ?", [.nullableText(resolved), .int(link.rowID)])
        }
    }

    private func noteExists(_ noteID: NoteID) throws -> Bool {
        try query("SELECT 1 FROM notes WHERE path = ? LIMIT 1", [.text(noteID.rawValue)]) { _ in true }.first == true
    }

    private func transaction(_ body: () throws -> Void) throws {
        try execute("BEGIN IMMEDIATE;")
        do {
            try body()
            try execute("COMMIT;")
        } catch {
            try? execute("ROLLBACK;")
            throw error
        }
    }

    private func userVersion() throws -> Int {
        try query("PRAGMA user_version;", []) { statement in
            Int(sqlite3_column_int(statement, 0))
        }.first ?? 0
    }

    private func execute(_ sql: String, _ bindings: [SQLiteValue] = []) throws {
        try withStatement(sql, bindings) { statement in
            while true {
                let result = sqlite3_step(statement)
                if result == SQLITE_DONE {
                    return
                }
                if result != SQLITE_ROW {
                    throw VaultIndexStoreError.stepFailed(errorMessage)
                }
            }
        }
    }

    private func query<T>(_ sql: String, _ bindings: [SQLiteValue], map: (OpaquePointer) throws -> T) throws -> [T] {
        try withStatement(sql, bindings) { statement in
            var rows: [T] = []
            while true {
                let result = sqlite3_step(statement)
                if result == SQLITE_ROW {
                    rows.append(try map(statement))
                } else if result == SQLITE_DONE {
                    return rows
                } else {
                    throw VaultIndexStoreError.stepFailed(errorMessage)
                }
            }
        }
    }

    private func withStatement<T>(_ sql: String, _ bindings: [SQLiteValue], body: (OpaquePointer) throws -> T) throws -> T {
        guard let database else {
            throw VaultIndexStoreError.openFailed("Database is not open.")
        }
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
            throw VaultIndexStoreError.prepareFailed(errorMessage)
        }
        defer { sqlite3_finalize(statement) }
        for (index, value) in bindings.enumerated() {
            try bind(value, to: Int32(index + 1), in: statement)
        }
        return try body(statement)
    }

    private func bind(_ value: SQLiteValue, to index: Int32, in statement: OpaquePointer) throws {
        let result: Int32
        switch value {
        case .text(let text):
            result = sqlite3_bind_text(statement, index, text, -1, SQLITE_TRANSIENT)
        case .nullableText(let text):
            if let text {
                result = sqlite3_bind_text(statement, index, text, -1, SQLITE_TRANSIENT)
            } else {
                result = sqlite3_bind_null(statement, index)
            }
        case .int(let number):
            result = sqlite3_bind_int64(statement, index, number)
        case .double(let number):
            result = sqlite3_bind_double(statement, index, number)
        }
        guard result == SQLITE_OK else {
            throw VaultIndexStoreError.stepFailed(errorMessage)
        }
    }

    private var errorMessage: String {
        guard let database else { return "Database is not open." }
        return String(cString: sqlite3_errmsg(database))
    }
}

private enum SQLiteValue {
    case text(String)
    case nullableText(String?)
    case int(Int64)
    case double(Double)
}

private func columnText(_ statement: OpaquePointer, _ index: Int32) -> String {
    guard let text = sqlite3_column_text(statement, index) else { return "" }
    return String(cString: text)
}

private func columnOptionalText(_ statement: OpaquePointer, _ index: Int32) -> String? {
    guard sqlite3_column_type(statement, index) != SQLITE_NULL else { return nil }
    return columnText(statement, index)
}

private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

private extension String {
    var stableFNV1a32: UInt32 {
        var hash: UInt32 = 2_166_136_261
        for byte in utf8 {
            hash ^= UInt32(byte)
            hash &*= 16_777_619
        }
        return hash
    }
}
