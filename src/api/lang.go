package api

import (
	"oshin/global"
)

func GetLang() (*global.LanguagePack, error) {
	return global.GetLangPack()
}

func GetALLLang() []global.LanguageInfo {
	return global.GetLangInfoList()
}