<?php

namespace Drupal\menu_migration\Form;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * The global settings form for menu migrations.
 */
class SettingsForm extends ConfigFormBase {

  const SETTINGS = 'menu_migration.settings';

  /**
   * The file system service.
   *
   * @var \Drupal\Core\File\FileSystemInterface
   */
  protected FileSystemInterface $fileSystem;

  /**
   * Constructs a new settings form for menu migrations.
   *
   * @param \Drupal\Core\Config\ConfigFactoryInterface $config_factory
   *   The config factory service.
   * @param \Drupal\Core\File\FileSystemInterface $fileSystem
   *   The file system service.
   */
  public function __construct(ConfigFactoryInterface $config_factory, FileSystemInterface $fileSystem) {
    parent::__construct($config_factory);
    $this->fileSystem = $fileSystem;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('config.factory'),
      $container->get('file_system'),
    );
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return [self::SETTINGS];
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'menu_migration_settings';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $form['export_path'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Export path'),
      '#description' => $this->t('Enter the path where the exported items should be stored (relative to Drupal root - %root_path).', [
        '%root_path' => DRUPAL_ROOT,
      ]),
      '#default_value' => $this->config(self::SETTINGS)->get('export_path'),
      '#required' => TRUE,
    ];
    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state) {
    $exportPath = $form_state->getValue('export_path');
    if (!empty($exportPath)) {
      $filename = DRUPAL_ROOT . '/' . $exportPath;
      if (!$this->fileSystem->prepareDirectory($filename, FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS)) {
        $form_state->setErrorByName('export_path', $this->t('Could not prepare destination directory @dir for menu migrations.', [
          '@dir' => $filename,
        ]));
      }
    }
    parent::validateForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $this->config(self::SETTINGS)->set('export_path', $form_state->getValue('export_path'))->save();
    parent::submitForm($form, $form_state);
  }

}
