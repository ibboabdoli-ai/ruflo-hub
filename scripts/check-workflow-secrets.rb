#!/usr/bin/env ruby
# Credential-free, parsed YAML check (not a security boundary).
require 'psych'

module WorkflowSecretsGuard
  module_function

  def verify!(source, name = '(workflow)')
    raise "#{name}: invalid UTF-8" unless source.valid_encoding?
    raise "#{name}: empty workflow" if source.strip.empty?
    raise "#{name}: forbidden secrets token" if source.match?(/\bsecrets\b/i)
    stream = Psych.parse_stream(source, filename: name)
    raise "#{name}: expected exactly one document" unless stream.children.length == 1
    walk!(stream, name)
    true
  rescue Psych::Exception => error
    raise "#{name}: malformed YAML: #{error.message}"
  end

  def walk!(node, name)
    raise "#{name}: aliases forbidden" if node.is_a?(Psych::Nodes::Alias)
    if node.is_a?(Psych::Nodes::Mapping)
      raise "#{name}: invalid mapping" unless node.children.length.even?
      node.children.each_slice(2) do |key, value|
        raise "#{name}: complex mapping key forbidden" unless key.is_a?(Psych::Nodes::Scalar)
        walk!(key, name)
        walk!(value, name)
      end
    elsif node.is_a?(Psych::Nodes::Scalar)
      # Values are checked after YAML escapes and line joining are decoded.
      raise "#{name}: forbidden decoded secrets token" if node.value.match?(/\bsecrets\b/i)
      raise "#{name}: custom tag forbidden" if node.tag && !node.tag.start_with?('tag:yaml.org,2002:')
    elsif node.respond_to?(:children)
      node.children.each { |child| walk!(child, name) }
    end
  end
end

if $PROGRAM_NAME == __FILE__
  abort 'No arguments allowed' unless ARGV.empty?
  files = Dir.glob(File.expand_path('../.github/workflows/*.{yml,yaml}', __dir__)).sort
  abort 'No workflow YAML found' if files.empty?
  begin
    files.each { |path| WorkflowSecretsGuard.verify!(File.read(path, encoding: 'UTF-8'), path) }
    puts "PASS: #{files.length} GitHub Actions workflow YAML files verified."
  rescue StandardError => error
    warn "FAIL: #{error.message}"
    exit 1
  end
end
