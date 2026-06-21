use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use std::env;
use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NoteEntry {
    path: String,
    title: String,
    modified_ms: u128,
    size: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NoteDocument {
    path: String,
    title: String,
    content: String,
    modified_ms: u128,
    size: u64,
    headings: Vec<Heading>,
    outgoing_links: Vec<Link>,
    backlinks: Vec<Backlink>,
}

#[derive(Debug, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct Heading {
    level: usize,
    text: String,
    anchor: String,
}

#[derive(Debug, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct Link {
    raw: String,
    target: String,
    heading: Option<String>,
    alias: Option<String>,
    kind: LinkKind,
}

#[derive(Debug, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
enum LinkKind {
    Markdown,
    Wiki,
    Embed,
    Tag,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Backlink {
    source_path: String,
    source_title: String,
    links: Vec<Link>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateNoteRequest {
    folder: Option<String>,
    title: Option<String>,
}

#[tauri::command]
fn list_notes(vault_path: String) -> Result<Vec<NoteEntry>, String> {
    let vault = canonical_vault(&vault_path)?;
    let mut notes = Vec::new();

    for entry in WalkDir::new(&vault)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| should_visit(entry.path(), &vault))
    {
        let entry = entry.map_err(|error| error.to_string())?;
        if !entry.file_type().is_file()
            || entry.path().extension().and_then(|ext| ext.to_str()) != Some("md")
        {
            continue;
        }

        notes.push(read_note_entry_metadata(&vault, entry.path())?);
    }

    notes.sort_by(|a, b| natural_key(&a.path).cmp(&natural_key(&b.path)));
    Ok(notes)
}

#[tauri::command]
fn initial_vault_path() -> Option<String> {
    env::var("EPHE_TAURI_VAULT")
        .ok()
        .filter(|path| !path.trim().is_empty())
        .or_else(|| {
            let mut args = env::args();
            while let Some(arg) = args.next() {
                if arg == "--vault" {
                    return args.next().filter(|path| !path.trim().is_empty());
                }
            }
            None
        })
}

#[tauri::command]
fn read_note(vault_path: String, path: String) -> Result<NoteDocument, String> {
    let vault = canonical_vault(&vault_path)?;
    let note_path = safe_join(&vault, &path)?;
    ensure_markdown_file(&note_path)?;

    let content = fs::read_to_string(&note_path).map_err(|error| error.to_string())?;
    let metadata = fs::metadata(&note_path).map_err(|error| error.to_string())?;
    let extracted = extract_markdown(&content);

    Ok(NoteDocument {
        path: normalize_relative_path(&vault, &note_path)?,
        title: infer_title(&path, &content),
        content,
        modified_ms: modified_ms(&metadata),
        size: metadata.len(),
        headings: extracted.headings,
        outgoing_links: extracted.links,
        backlinks: Vec::new(),
    })
}

#[tauri::command]
fn get_backlinks(vault_path: String, path: String) -> Result<Vec<Backlink>, String> {
    let vault = canonical_vault(&vault_path)?;
    collect_backlinks(&vault, &path)
}

#[tauri::command]
fn save_note(vault_path: String, path: String, content: String) -> Result<NoteDocument, String> {
    let vault = canonical_vault(&vault_path)?;
    let note_path = safe_join(&vault, &path)?;
    ensure_markdown_file(&note_path)?;

    fs::write(&note_path, content).map_err(|error| error.to_string())?;
    read_note(vault_path, path)
}

#[tauri::command]
fn create_note(vault_path: String, request: CreateNoteRequest) -> Result<NoteDocument, String> {
    let vault = canonical_vault(&vault_path)?;
    let folder = request.folder.as_deref().unwrap_or("");
    let title = request.title.as_deref().unwrap_or("Untitled");
    let folder_path = safe_join(&vault, folder)?;
    fs::create_dir_all(&folder_path).map_err(|error| error.to_string())?;

    let stem = sanitize_name(title);
    let path = unique_note_path(&folder_path, &stem)?;
    fs::write(&path, format!("# {title}\n")).map_err(|error| error.to_string())?;

    let relative = normalize_relative_path(&vault, &path)?;
    read_note(vault.to_string_lossy().to_string(), relative)
}

#[tauri::command]
fn create_folder(
    vault_path: String,
    parent: Option<String>,
    name: String,
) -> Result<String, String> {
    let vault = canonical_vault(&vault_path)?;
    let parent = parent.as_deref().unwrap_or("");
    let parent_path = safe_join(&vault, parent)?;
    let folder_path = parent_path.join(sanitize_name(&name));
    ensure_inside(&vault, &folder_path)?;
    fs::create_dir_all(&folder_path).map_err(|error| error.to_string())?;
    normalize_relative_path(&vault, &folder_path)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            initial_vault_path,
            list_notes,
            read_note,
            get_backlinks,
            save_note,
            create_note,
            create_folder
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Ephe Tauri");
}

#[derive(Debug, Default)]
struct ExtractedMarkdown {
    headings: Vec<Heading>,
    links: Vec<Link>,
}

fn read_note_entry_metadata(vault: &Path, path: &Path) -> Result<NoteEntry, String> {
    let metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    let relative = normalize_relative_path(vault, path)?;

    Ok(NoteEntry {
        title: infer_path_title(&relative),
        path: relative,
        modified_ms: modified_ms(&metadata),
        size: metadata.len(),
    })
}

fn collect_backlinks(vault: &Path, target_path: &str) -> Result<Vec<Backlink>, String> {
    let mut backlinks = Vec::new();
    let target_stem = Path::new(target_path)
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or(target_path)
        .to_lowercase();
    let target_path_no_ext = strip_markdown_extension(target_path).to_lowercase();

    for entry in WalkDir::new(vault)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| should_visit(entry.path(), vault))
    {
        let entry = entry.map_err(|error| error.to_string())?;
        if !entry.file_type().is_file()
            || entry.path().extension().and_then(|ext| ext.to_str()) != Some("md")
        {
            continue;
        }

        let source_path = normalize_relative_path(vault, entry.path())?;
        if source_path == target_path {
            continue;
        }

        let content = fs::read_to_string(entry.path()).unwrap_or_default();
        let links: Vec<Link> = extract_markdown(&content)
            .links
            .into_iter()
            .filter(|link| link_matches_target(link, &target_stem, &target_path_no_ext))
            .collect();

        if !links.is_empty() {
            backlinks.push(Backlink {
                source_title: infer_title(&source_path, &content),
                source_path,
                links,
            });
        }
    }

    Ok(backlinks)
}

fn extract_markdown(content: &str) -> ExtractedMarkdown {
    let mut extracted = ExtractedMarkdown::default();
    let mut seen_tags = BTreeSet::new();

    for line in content.lines() {
        if let Some(heading) = parse_heading(line) {
            extracted.headings.push(heading);
        }

        extracted.links.extend(parse_markdown_links(line));
        extracted.links.extend(parse_wiki_links(line));

        for tag in parse_tags(line) {
            if seen_tags.insert(tag.target.clone()) {
                extracted.links.push(tag);
            }
        }
    }

    extracted
}

fn parse_heading(line: &str) -> Option<Heading> {
    let trimmed = line.trim_start();
    let level = trimmed.chars().take_while(|char| *char == '#').count();
    if level == 0 || level > 6 || !trimmed[level..].starts_with(' ') {
        return None;
    }

    let text = trimmed[level..].trim().to_string();
    if text.is_empty() {
        return None;
    }

    Some(Heading {
        level,
        anchor: slugify(&text),
        text,
    })
}

fn parse_markdown_links(line: &str) -> Vec<Link> {
    let mut links = Vec::new();
    let bytes = line.as_bytes();
    let mut index = 0;

    while index < bytes.len() {
        let Some(label_start) = line[index..].find('[').map(|offset| index + offset) else {
            break;
        };
        let Some(label_end) = line[label_start + 1..]
            .find(']')
            .map(|offset| label_start + 1 + offset)
        else {
            break;
        };
        if line[label_end + 1..].starts_with('(') {
            let target_start = label_end + 2;
            if let Some(target_end) = line[target_start..]
                .find(')')
                .map(|offset| target_start + offset)
            {
                let alias = line[label_start + 1..label_end].trim();
                let target = line[target_start..target_end].trim();
                if !target.is_empty() {
                    links.push(Link {
                        raw: line[label_start..=target_end].to_string(),
                        target: target.to_string(),
                        heading: None,
                        alias: (!alias.is_empty()).then(|| alias.to_string()),
                        kind: LinkKind::Markdown,
                    });
                }
                index = target_end + 1;
                continue;
            }
        }
        index = label_end + 1;
    }

    links
}

fn parse_wiki_links(line: &str) -> Vec<Link> {
    let mut links = Vec::new();
    let mut index = 0;

    while let Some(start) = line[index..].find("[[").map(|offset| index + offset) {
        let embed = start > 0 && line.as_bytes()[start - 1] == b'!';
        let content_start = start + 2;
        let Some(end) = line[content_start..]
            .find("]]")
            .map(|offset| content_start + offset)
        else {
            break;
        };
        let body = line[content_start..end].trim();
        if !body.is_empty() {
            let (target_part, alias) = split_once(body, '|');
            let (target, heading) = split_once(target_part.trim(), '#');
            let target = target.trim();
            if !target.is_empty() {
                links.push(Link {
                    raw: line[start..end + 2].to_string(),
                    target: target.to_string(),
                    heading: heading
                        .map(|value| value.trim().to_string())
                        .filter(|value| !value.is_empty()),
                    alias: alias
                        .map(|value| value.trim().to_string())
                        .filter(|value| !value.is_empty()),
                    kind: if embed {
                        LinkKind::Embed
                    } else {
                        LinkKind::Wiki
                    },
                });
            }
        }
        index = end + 2;
    }

    links
}

fn parse_tags(line: &str) -> Vec<Link> {
    line.split_whitespace()
        .filter_map(|word| {
            let tag = word
                .trim_matches(|char: char| matches!(char, ',' | '.' | ':' | ';' | ')' | ']' | '}'));
            let tag = tag.strip_prefix('#')?;
            if tag.is_empty() || tag.chars().any(|char| char.is_whitespace()) {
                return None;
            }

            Some(Link {
                raw: format!("#{tag}"),
                target: tag.to_string(),
                heading: None,
                alias: None,
                kind: LinkKind::Tag,
            })
        })
        .collect()
}

fn split_once(value: &str, delimiter: char) -> (&str, Option<&str>) {
    if let Some(index) = value.find(delimiter) {
        (
            &value[..index],
            Some(&value[index + delimiter.len_utf8()..]),
        )
    } else {
        (value, None)
    }
}

fn link_matches_target(link: &Link, target_stem: &str, target_path_no_ext: &str) -> bool {
    if matches!(link.kind, LinkKind::Markdown) && is_external_url(&link.target) {
        return false;
    }

    let target = strip_markdown_extension(&link.target).to_lowercase();
    let basename = Path::new(&target)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(&target)
        .to_string();

    target == target_path_no_ext || basename == target_stem
}

fn is_external_url(target: &str) -> bool {
    target.starts_with("http://")
        || target.starts_with("https://")
        || target.starts_with("mailto:")
        || target.starts_with("tel:")
}

fn infer_title(path: &str, content: &str) -> String {
    content
        .lines()
        .find_map(|line| parse_heading(line).map(|heading| heading.text))
        .unwrap_or_else(|| infer_path_title(path))
}

fn infer_path_title(path: &str) -> String {
    Path::new(path)
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or(path)
        .to_string()
}

fn slugify(text: &str) -> String {
    text.trim()
        .to_lowercase()
        .chars()
        .map(|char| {
            if char.is_ascii_alphanumeric() {
                char
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn sanitize_name(name: &str) -> String {
    let sanitized = name
        .trim()
        .chars()
        .map(|char| match char {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            _ => char,
        })
        .collect::<String>();

    if sanitized.is_empty() {
        "Untitled".to_string()
    } else {
        sanitized
    }
}

fn unique_note_path(folder: &Path, stem: &str) -> Result<PathBuf, String> {
    let first = folder.join(format!("{stem}.md"));
    if !first.exists() {
        return Ok(first);
    }

    for index in 2..10_000 {
        let path = folder.join(format!("{stem} {index}.md"));
        if !path.exists() {
            return Ok(path);
        }
    }

    Err("could not find a unique note name".to_string())
}

fn should_visit(path: &Path, vault: &Path) -> bool {
    if path == vault {
        return true;
    }

    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| !name.starts_with('.') && name != "node_modules")
        .unwrap_or(true)
}

fn canonical_vault(vault_path: &str) -> Result<PathBuf, String> {
    let vault = fs::canonicalize(vault_path).map_err(|error| error.to_string())?;
    if !vault.is_dir() {
        return Err("vault path must be a directory".to_string());
    }
    Ok(vault)
}

fn safe_join(vault: &Path, relative: &str) -> Result<PathBuf, String> {
    let mut path = vault.to_path_buf();
    for component in Path::new(relative).components() {
        match component {
            Component::Normal(part) => path.push(part),
            Component::CurDir => {}
            _ => return Err("path escapes the vault".to_string()),
        }
    }
    ensure_inside(vault, &path)?;
    Ok(path)
}

fn ensure_inside(vault: &Path, path: &Path) -> Result<(), String> {
    let parent = path.parent().unwrap_or(path);
    let canonical_parent = match fs::canonicalize(parent) {
        Ok(parent) => parent,
        Err(error) if error.kind() == io::ErrorKind::NotFound => parent.to_path_buf(),
        Err(error) => return Err(error.to_string()),
    };
    if canonical_parent.starts_with(vault) {
        Ok(())
    } else {
        Err("path escapes the vault".to_string())
    }
}

fn ensure_markdown_file(path: &Path) -> Result<(), String> {
    if path.extension().and_then(|ext| ext.to_str()) == Some("md") {
        Ok(())
    } else {
        Err("only Markdown files can be opened".to_string())
    }
}

fn normalize_relative_path(vault: &Path, path: &Path) -> Result<String, String> {
    path.strip_prefix(vault)
        .map_err(|error| error.to_string())
        .map(|relative| relative.to_string_lossy().replace('\\', "/"))
}

fn strip_markdown_extension(path: &str) -> String {
    path.strip_suffix(".md").unwrap_or(path).to_string()
}

fn natural_key(path: &str) -> String {
    path.to_lowercase()
}

fn modified_ms(metadata: &fs::Metadata) -> u128 {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn extracts_headings_links_wiki_embeds_and_tags() {
        let extracted = extract_markdown(
            "# Title\n[Site](https://example.com)\n[[Note#Part|Alias]] ![[image.png]] #tag\n",
        );

        assert_eq!(
            extracted.headings,
            vec![Heading {
                level: 1,
                text: "Title".to_string(),
                anchor: "title".to_string(),
            }]
        );
        assert!(extracted
            .links
            .iter()
            .any(|link| link.kind == LinkKind::Wiki && link.target == "Note"));
        assert!(extracted
            .links
            .iter()
            .any(|link| link.kind == LinkKind::Embed && link.target == "image.png"));
        assert!(extracted
            .links
            .iter()
            .any(|link| link.kind == LinkKind::Tag && link.target == "tag"));
    }

    #[test]
    #[ignore]
    fn benchmark_synthetic_vault_operations() {
        let note_count = env::var("EPHE_TAURI_BENCH_NOTES")
            .ok()
            .and_then(|value| value.parse::<usize>().ok())
            .unwrap_or(5_000);
        let vault = env::temp_dir().join(format!(
            "ephe-tauri-benchmark-{}-{}",
            std::process::id(),
            modified_ms(&fs::metadata(env::current_exe().unwrap()).unwrap())
        ));

        fs::create_dir_all(&vault).unwrap();
        for index in 0..note_count {
            let folder = vault.join(format!("folder-{:02}", index % 24));
            fs::create_dir_all(&folder).unwrap();
            let path = folder.join(format!("Note {index:05}.md"));
            let linked = (index + note_count / 2) % note_count;
            fs::write(
                path,
                format!(
                    "# Note {index:05}\n\n[[Note {linked:05}]] #tag{}\n\n{}\n",
                    index % 32,
                    "body ".repeat(64)
                ),
            )
            .unwrap();
        }

        let vault_path = vault.to_string_lossy().to_string();
        let list_start = Instant::now();
        let notes = list_notes(vault_path.clone()).unwrap();
        let list_ms = list_start.elapsed().as_secs_f64() * 1_000.0;
        assert_eq!(notes.len(), note_count);

        let target = notes[note_count / 2].path.clone();
        let read_start = Instant::now();
        let document = read_note(vault_path.clone(), target.clone()).unwrap();
        let read_ms = read_start.elapsed().as_secs_f64() * 1_000.0;
        assert!(!document.content.is_empty());

        let backlink_start = Instant::now();
        let backlinks = get_backlinks(vault_path.clone(), target.clone()).unwrap();
        let backlink_ms = backlink_start.elapsed().as_secs_f64() * 1_000.0;

        let save_start = Instant::now();
        let saved = save_note(vault_path, target, format!("{}\n", document.content)).unwrap();
        let save_ms = save_start.elapsed().as_secs_f64() * 1_000.0;
        assert!(!saved.content.is_empty());

        println!(
            "EPHE_TAURI_BENCHMARK_SUMMARY notes={} list_ms={:.2} read_ms={:.2} backlinks_ms={:.2} save_ms={:.2} backlinks={}",
            note_count,
            list_ms,
            read_ms,
            backlink_ms,
            save_ms,
            backlinks.len()
        );

        fs::remove_dir_all(vault).unwrap();
    }
}
