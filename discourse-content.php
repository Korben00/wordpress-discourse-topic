<?php
/**
 * Plugin Name: Discourse Topic
 */

// Add admin stylesheet
function testeleven_admin_styles() {
  wp_enqueue_style('admin-style', plugins_url('admin_styles.css', __FILE__));
}
add_action('admin_enqueue_scripts', 'testeleven_admin_styles');

// Add the 'Fetch Discourse Topic' meta-box to the admin page

function testeleven_add_discourse_meta_box() {
  add_meta_box(
    'discourse-fetch',
    'Get Discourse Topic',
    'testeleven_create_get_topic_form',
     null,
    'normal',
    'high'
  );
}
add_action('add_meta_boxes', 'testeleven_add_discourse_meta_box');

function testeleven_create_get_topic_form() {?>
  <form method="get" action="<?php $_SERVER['PHP_SELF']; ?>">
    <label for="discourse-base-url">Base URL</label>
    <input type="text" id="discourse-base-url" value="" name="discourse-base-url"/>
    <label for="discourse-topic-id">Topic ID</label>
    <input type="text" id="discourse-topic-id" name="discourse-topic-id"/>
    <a href="#" class="button get-topic" id="get-topic">Fetch Discourse Topic</a>
  </form>
  <div class="topic-posts"></div>
<?php
}

// Request the Discourse topic on the server
function testeleven_get_discourse_topic() {
  ?>
  <script>
    jQuery(function($) {
      $('#get-topic').click(function (e) {
        // Add nonce to #discourse-fetch-topic and check here
        var data = {
          'action': 'get_json',
          'base_url': $('#discourse-base-url').val(),
          'topic_id': $('#discourse-topic-id').val()
        };
        $.getJSON(ajaxurl, data, function(response) {
          var topic_posts = response['post_stream']['posts'];
          var all_posts_in_topic = '';
          var $topic_posts = $('.topic-posts');

          $topic_posts.html('');

          topic_posts.forEach(function (topic_post) {
            all_posts_in_topic += '<div class="topic-select"><label for="topic-' + topic_post['post_number'] +
            '">Include this post?</label> ' + '<input class="post-select" type="checkbox" name="topic-' +
            topic_post['post_number'] + '" value="'+ topic_post['post_number'] + '"/>' +
            '<div class="topic-post">' + topic_post['cooked'] + '</div></div>';
          });

          $topic_posts.append(all_posts_in_topic);
        });
        e.preventDefault();
      });

      $('#discourse-fetch').on('change', '.post-select', function(e) {
        var output = '<article class="discourse-topic">'; // If we want to append to the current content of the editor then output should be set to that.
        $.each($('.topic-select'), function() {
          if ($(this).find('.post-select').attr('checked')) {
            output += '<div class="discourse-post">' + $(this).find('.topic-post').html() + '</div>';
          }
        });
        output += '</article>';
        $('#content').html(output);
        e.preventDefault();
      });
    });
  </script>
<?php
}
add_action('admin_footer', 'testeleven_get_discourse_topic');

add_action('wp_ajax_get_json', 'testeleven_get_json');

function testeleven_get_json() {
  $base_url = $_GET['base_url'];
  $topic_id = $_GET['topic_id'];
  $topic_json_url = $base_url . '/t/' . $topic_id . '.json';
  $topic_json = file_get_contents($topic_json_url);
  echo $topic_json;
  wp_die();
}
