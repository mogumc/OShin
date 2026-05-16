package global

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"

	"golang.org/x/crypto/pbkdf2"
)

const (
	// passphrase 用于密钥派生的硬编码密码
	passphrase = "oshin-client-key"
	// pbkdf2 迭代次数
	pbkdf2Iterations = 100000
	// AES-256 需要 32 字节密钥
	keyLen = 32
	// GCM nonce 长度
	nonceLen = 12
)

// deriveKey 使用 PBKDF2 从 salt 派生 AES-256 密钥
func deriveKey(salt []byte) []byte {
	return pbkdf2.Key([]byte(passphrase), salt, pbkdf2Iterations, keyLen, sha256.New)
}

// GetEncryptionKey 从全局配置的 salt 获取加密密钥
func GetEncryptionKey() ([]byte, error) {
	if GlobalConfig.Salt == "" {
		return nil, fmt.Errorf("加密盐未配置")
	}
	salt, err := hexDecode(GlobalConfig.Salt)
	if err != nil {
		return nil, fmt.Errorf("解析加密盐失败: %v", err)
	}
	return deriveKey(salt), nil
}

// EncryptField 使用 AES-256-GCM 加密字段，返回 base64 编码
func EncryptField(plaintext string) (string, error) {
	key, err := GetEncryptionKey()
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("创建 AES cipher 失败: %v", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("创建 GCM 失败: %v", err)
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("生成 nonce 失败: %v", err)
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptField 使用 AES-256-GCM 解密字段
func DecryptField(ciphertext string) (string, error) {
	key, err := GetEncryptionKey()
	if err != nil {
		return "", err
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("base64 解码失败: %v", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("创建 AES cipher 失败: %v", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("创建 GCM 失败: %v", err)
	}

	nonceSize := aesGCM.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("密文数据过短")
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := aesGCM.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", fmt.Errorf("解密失败: %v", err)
	}

	return string(plaintext), nil
}

// hexDecode 解码 hex 字符串
func hexDecode(s string) ([]byte, error) {
	// 简单的 hex 解码，避免导入 encoding/hex
	if len(s)%2 != 0 {
		return nil, fmt.Errorf("无效的 hex 字符串")
	}
	b := make([]byte, len(s)/2)
	for i := 0; i < len(s); i += 2 {
		var hi, lo byte
		switch {
		case s[i] >= '0' && s[i] <= '9':
			hi = s[i] - '0'
		case s[i] >= 'a' && s[i] <= 'f':
			hi = s[i] - 'a' + 10
		case s[i] >= 'A' && s[i] <= 'F':
			hi = s[i] - 'A' + 10
		default:
			return nil, fmt.Errorf("无效的 hex 字符: %c", s[i])
		}
		switch {
		case s[i+1] >= '0' && s[i+1] <= '9':
			lo = s[i+1] - '0'
		case s[i+1] >= 'a' && s[i+1] <= 'f':
			lo = s[i+1] - 'a' + 10
		case s[i+1] >= 'A' && s[i+1] <= 'F':
			lo = s[i+1] - 'A' + 10
		default:
			return nil, fmt.Errorf("无效的 hex 字符: %c", s[i+1])
		}
		b[i/2] = hi<<4 | lo
	}
	return b, nil
}
