// import { AgentMarkdown } from "agentmarkdown"
import { NodeHtmlMarkdown } from 'node-html-markdown'
import {
  writeTextToFile,
  createDir,
  fileExistsAtPath,
} from "@activescott/apple-jsx/fs"
import { logger } from "../../lib/logger"
import { NotesNote } from "@activescott/apple-jsx-apps/notes"
import { NotesAttachment } from "@activescott/apple-jsx-apps/notes"
import * as mimeTypes from "mime-types"
import { parse } from "@activescott/apple-jsx/path"
// const fs = require('fs')

export async function exportNote(
  note: NotesNote,
  outputDir: string
): Promise<void> {
  const log = logger("joplin exportNote")

  outputDir = outputDir
  createDir(outputDir)

  if (!note) throw new Error("note must be provided.")
  if (!outputDir) throw new Error("outputDir must be provided.")

  log(`exporting note '${noteTitle(note)}'`)

  const html = note.body
  let markdown = ""
  let noteFilePath = resolveFilePathUnique(
    outputDir,
    safeFileName(noteTitle(note))+'.md'
  )
  const tags = ['Apple Notes']
  if (note.folder && note.folder.name) {
    tags.push(note.folder.name)
  }
  if (hasAttachments(note)) {
    tags.push(attachmentTagName(noteTitle(note)))
  }
  const meta = createMeta(
    note.creationDate,
    note.modificationDate,
    tags,
    safeFileName(noteTitle(note))
  )
  console["assert"] = () => null
  const options = {
    keepDataImages: true
  };
  markdown = await NodeHtmlMarkdown.translate(html, options)
  // markdown = saveImages(markdown, noteFilePath)
  // markdown = await AgentMarkdown.produce(html)
  writeTextToFile(meta+markdown, noteFilePath)
  writeTextToFile(html, noteFilePath+".html")
  // write attachments
  // for (const attachment of note.attachments()) {
  //   log(`exporting attachment: ${attachment.name}`)
  //   exportAttachment(attachment, outputDir, noteTitle(note))
  // }
}

function saveImages(markdown: string, noteFilePath: string): string {
  const imageRegex = /!\[.*?\]\(data:image\/(.*?);base64,(.*?)\)/g
  let match
  let imageIndex = 1

  while ((match = imageRegex.exec(markdown)) !== null) {
      const extension = match[1]
      const base64Data = match[2]
      const buffer = Buffer.from(base64Data, 'base64')
      const fileName = `image${imageIndex}.${extension}`
      const filePath = noteFilePath+'-'+fileName

      // fs.writeFileSync(filePath,buffer)
      markdown = markdown.replace(match[0], `![image${imageIndex}](./${fileName})`)
      imageIndex++
  }

  return markdown
}

/**
 * Returns a path resolved for the given file; also ensures it is unique by adding a postfix as needed
 * @param outputDir output dir for the file
 * @param fileName the file name
 */
const resolveFilePathUnique = (outputDir: string, fileName: string): string => {
  let counter = -1
  let path: string 
  do {
    if (++counter > 0) {
      const parts = parse(fileName)
      path = `${outputDir}/${parts.name} (${counter})${parts.ext}`
    } else {
      path = `${outputDir}/${fileName}`
    }
  } while (fileExistsAtPath(path))
  return path
}

const hasAttachments = (note: NotesNote): boolean => {
  // eslint-disable-next-line no-empty-pattern
  for (const {} of note.attachments()) {
    return true
  }
  return false
}

// NOTE: long titles end in a funky ellipses character
const noteTitle = (note: NotesNote): string =>
  note.name.endsWith("…") ? note.name.slice(0, note.name.length - 1) : note.name

const attachmentTagName = (noteTitle: string): string =>
  `Attachments for ${noteTitle}`

function exportAttachment(
  attachment: NotesAttachment,
  outputDir: string,
  noteTitle: string,
): void {
  const attachmentFilePath = resolveFilePathUnique(
    outputDir,
    safeFileName(attachment.name)
  )
  try {
    attachment.save(attachmentFilePath)
  } catch (err) {
    /* eslint-disable no-console,no-magic-numbers */
    console.log("\n" + "*".repeat(50))
    console.log(
      `Error saving attachment ${attachment.name} of note ${noteTitle}!`
    )
    console.log("*".repeat(50) + "\n")
    /* eslint-enable no-console,no-magic-numbers */
    // TODO: Pass in a command line argument that allows continuing on failures; by default fail and stop
    return
  }
  
}

const contentTypeForAttachment = (attachment: NotesAttachment): string => {
  const fallback = "application/octet-stream"
  // first look for a file extension:
  const parts = attachment.name.split(".")
  if (parts.length > 1) {
    const t = mimeTypes.lookup(parts[parts.length - 1])
    return t ? t : fallback
  } else {
    return fallback
  }
}

const safeFileName = (fileName: string): string => {
  // although this isn't perfect, it seemed like a safe set: https://www.ibm.com/support/knowledgecenter/SSLTBW_2.1.0/com.ibm.zos.v2r1.bpxa400/bpxug469.htm
  if (!fileName) fileName = "null"
  const matchForbiddenChars = /[^A-Яа-яA-Za-z0-9._-]/gi
  return fileName.replace(matchForbiddenChars, "_")
}

function createMeta(
  created: Date,
  modified: Date,
  tags: string[],
  title: string,
): string {
  let str = `---
title: ${title}
updated: ${dateStr(modified)}
created: ${dateStr(created)}
tags: 
${tagsStr(tags)}
---
`
  return str
}

const tagsStr = (tagsArray: string[]): string =>
  tagsArray.map((tag) => ('  - '+tag.toLowerCase())).join("\n")

/** Returns date like YYYY-MM-DD HH:MM **/
const dateStr = (date: Date): string =>
  /* eslint-disable no-magic-numbers */
  date.getUTCFullYear() + '-' +
  date.getUTCMonth().toString().padStart(2, "0") + '-' +
  date.getUTCDate().toString().padStart(2, "0") + ' ' +
  date.getUTCHours().toString().padStart(2, "0") + ':' +
  date.getUTCMinutes().toString().padStart(2, "0")
/* eslint-enable no-magic-numbers */
