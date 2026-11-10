# Generates AppReviewRecorder.xcodeproj: a tiny host app and the UI test that
# records the App Review video. The project is committed; run this again only
# to change its structure (gem install xcodeproj; ruby make-project.rb).
require 'xcodeproj'

dir = __dir__
path = File.join(dir, 'AppReviewRecorder.xcodeproj')
team = File.read(File.join(dir, '../App/App.xcodeproj/project.pbxproj'))[/DEVELOPMENT_TEAM = (\w+);/, 1]
ios = '17.0'

project = Xcodeproj::Project.new(path)
project.root_object.attributes['LastUpgradeCheck'] = '1600'

host = project.new_target(:application, 'RecorderHost', :ios, ios)
tests = project.new_target(:ui_test_bundle, 'RecorderUITests', :ios, ios)
tests.add_dependency(host)

host_group = project.main_group.new_group('RecorderHost', 'RecorderHost')
host.add_file_references([host_group.new_reference('RecorderHostApp.swift')])

test_group = project.main_group.new_group('RecorderUITests', 'RecorderUITests')
tests.add_file_references(%w[SceneRunner.swift AppReviewRecordingTests.swift].map { |f| test_group.new_reference(f) })
scenes = project.main_group.new_reference('scenes.json')
tests.resources_build_phase.add_file_reference(scenes)

common = {
  'DEVELOPMENT_TEAM' => team,
  'CODE_SIGN_STYLE' => 'Automatic',
  'IPHONEOS_DEPLOYMENT_TARGET' => ios,
  'SWIFT_VERSION' => '5.0',
  'TARGETED_DEVICE_FAMILY' => '1',
  'GENERATE_INFOPLIST_FILE' => 'YES',
  'CURRENT_PROJECT_VERSION' => '1',
  'MARKETING_VERSION' => '1.0',
}
host.build_configurations.each do |c|
  c.build_settings.merge!(common).merge!(
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.habboubah.spartopf.recorder',
    'PRODUCT_NAME' => 'RecorderHost',
    'INFOPLIST_KEY_CFBundleDisplayName' => 'Recorder',
    'INFOPLIST_KEY_UIApplicationSceneManifest_Generation' => 'YES',
    'INFOPLIST_KEY_UILaunchScreen_Generation' => 'YES',
    'ASSETCATALOG_COMPILER_APPICON_NAME' => '',
  )
end
tests.build_configurations.each do |c|
  c.build_settings.merge!(common).merge!(
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.habboubah.spartopf.recorder.uitests',
    'PRODUCT_NAME' => 'RecorderUITests',
    'TEST_TARGET_NAME' => 'RecorderHost',
  )
end

attrs = project.root_object.attributes['TargetAttributes'] ||= {}
attrs[host.uuid] = { 'CreatedOnToolsVersion' => '16.0' }
attrs[tests.uuid] = { 'CreatedOnToolsVersion' => '16.0', 'TestTargetID' => host.uuid }

project.save

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(host)
scheme.add_test_target(tests)
scheme.set_launch_target(host)
scheme.save_as(path, 'AppReviewRecorder', true)
puts "wrote #{path} (team #{team})"
