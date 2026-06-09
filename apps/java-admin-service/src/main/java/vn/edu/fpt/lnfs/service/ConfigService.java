package vn.edu.fpt.lnfs.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.lnfs.entity.ConfigEntryEntity;
import vn.edu.fpt.lnfs.entity.ConfigHistoryEntity;
import vn.edu.fpt.lnfs.repository.ConfigEntryRepository;
import vn.edu.fpt.lnfs.repository.ConfigHistoryRepository;

@Service
public class ConfigService {
  private final ConfigEntryRepository configEntryRepository;
  private final ConfigHistoryRepository configHistoryRepository;
  private final AuthContext authContext;
  private final ObjectMapper objectMapper;

  public ConfigService(ConfigEntryRepository configEntryRepository, ConfigHistoryRepository configHistoryRepository,
      AuthContext authContext, ObjectMapper objectMapper) {
    this.configEntryRepository = configEntryRepository;
    this.configHistoryRepository = configHistoryRepository;
    this.authContext = authContext;
    this.objectMapper = objectMapper;
  }

  public List<ConfigEntryEntity> list() {
    return configEntryRepository.findAll();
  }

  public List<ConfigHistoryEntity> history() {
    return configHistoryRepository.findTop50ByOrderByChangedAtDesc();
  }

  @Transactional
  public ConfigEntryEntity update(String key, String value) {
    ConfigEntryEntity entry = configEntryRepository.findByConfigKey(key)
        .orElseThrow(() -> new NoSuchElementException("Config key not found"));
    validateValue(entry, value);
    String oldValue = entry.getConfigValue();
    entry.setConfigValue(value);
    entry.setUpdatedBy(authContext.currentUserId());
    entry.touch();
    configHistoryRepository.save(new ConfigHistoryEntity(
        UUID.randomUUID().toString(),
        key,
        oldValue,
        value,
        authContext.currentUserId()));
    return configEntryRepository.save(entry);
  }

  private void validateValue(ConfigEntryEntity entry, String value) {
    try {
      switch (entry.getValueType()) {
        case INTEGER -> Integer.parseInt(value);
        case FLOAT -> Double.parseDouble(value);
        case BOOLEAN -> {
          if (!"true".equalsIgnoreCase(value) && !"false".equalsIgnoreCase(value)) {
            throw new IllegalArgumentException("Expected boolean value");
          }
        }
        case JSON -> objectMapper.readTree(value);
        case STRING -> {
        }
      }
    } catch (Exception exception) {
      throw new IllegalStateException("Invalid value for " + entry.getValueType() + " config");
    }
  }
}
