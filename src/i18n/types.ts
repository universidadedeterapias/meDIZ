export type LanguageOption = {
  code: string
  label: string
}

export type MessagesDictionary = Record<string, string>

export type LanguageMessages = Record<string, string | MessagesDictionary>

export type Translations = Record<string, string>

