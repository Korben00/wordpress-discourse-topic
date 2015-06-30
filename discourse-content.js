jQuery(document).ready(function($) {
  $('#get-topic').click(function (e) {
    // Outer scope variables
    var url = $('#discourse-url').val(),
        topic_id,
        base_url,
        initial_request_url,
        post_request_url;

    if (is_url(url) && (topic_id = get_topic_id(url))) {
      // Create your urls here
      base_url = get_base_url(url);
      initial_request_url = base_url + '.json';
      post_request_url = base_url + '/' + 'posts.json?';
    } else {
      $('#discourse-message').addClass('warning');
      $('#discourse-message').html('\'' + url + '\'' + ' is not a Discourse topic URL. ' +
      'Please copy and paste a valid URL from a Discourse forum topic into the \'URL\' input.');
    }

    console.log('base url: ', base_url);

    // If there has been an error, clear the error message when the user inputs a
    // new URL.
    clear_message_on_click($('#discourse-url'));



    // Data object for the WordPress ajax call. The 'action' property is used to create the WordPress action
    // 'wp_ajax_'{action name} that can be used to call a php function on the server. Here is is calling the
    // get_json() method which is used to retrieve the json data.
    var data = {
      'action': 'get_json',
      'url': initial_request_url
    };

    // Use the initial request to gather data about the topic.
    $.getJSON(ajaxurl, data, function (response) {
      var chunk_size = response['chunk_size'];
      var stream = response['post_stream']['stream']; // The array of post_ids in the topic.
      var $target = $('.topic-posts'); // This is where we are going to output the topic posts.

      set_title(response);
      console.log(response);

      // Clear the target in case the form is submitted more than once.
      $target.html('');

      add_meta_box_post_content(response, stream, $target, chunk_size);

    });

    function add_meta_box_post_content(response, post_stream, target, chunk_size) {
      // On the initial request posts are in the post_stream object. On subsequent requests, posts are in the 'posts' object.
      var posts = (response.hasOwnProperty('post_stream')) ? response['post_stream']['posts'] : response['posts'];
//            var load_posts = '<div class="load-posts"><button>Load Posts in Editor</button></div>';
      var output = [];
      var current_request_ids;

      output.push(
        '<div class="discourse-topic-controls clearfix">' +
        '<label for="post-select-toggle" class="post-select-label">Unselect all Posts</label>' +
        '<input type="checkbox" class="post-select-toggle unselect" name="post-select-toggle" />' +
        '<button class="load-posts">Load Posts in Editor</button>' +
        '</div>'
      );

      // Append each post to the output string and remove it from the post_stream array.
      posts.forEach(function(post) {
        var post_id = post['id'];
        output.push(
          '<div class="post-select">' +
          '<label for="post-' + post_id + '">Include this post?</label> ' +
          '<input class="post-select-box" type="checkbox" name="post-' + post_id + '" value="' + post_id + '" checked="checked"/>' +
          '<div class="topic-post">' +
          '<div class="post-meta">' +
          'Posted by <span class="username">' + post['username'] +
          '<span> on <span class="post-date">' + parse_date(post['created_at']) + '</span>' +
          '</div>' + // .post-meta
          post['cooked'] + // post content
          '</div>' + // .topic-post
          '</div>' // .post-select
        );

        // Remove the post from the post_stream array.
        post_stream.shift();
      });

      output.join('');
      target.append(output);

      // Clear the array
      output.length = 0;

      // If there are still posts in post_stream, use them to construct a url. Then make the
      // ajax call and recursively call the add_meta_box_content() function.
      if (post_stream.length > 0) {
        // Get the next chunk of posts.
        if (post_stream.length > chunk_size) {
          current_request_ids = post_stream.slice(0, chunk_size);
        } else {
          current_request_ids = post_stream;
        }

        // Construct the url
        current_request_ids.forEach(function(id, index) {
//                topic_posts_base_url += 'post_ids%5B%5D=' + id;
          post_request_url += 'post_ids[]=' + id;
          if (index < current_request_ids.length - 1) {
            post_request_url += '&';
          }
        });

        data = {
          'action': 'get_json',
          'url': post_request_url
        };
        $.getJSON(ajaxurl, data, function(response) {
          add_meta_box_post_content(response, post_stream, target, chunk_size);
        });
      }

      // Make nice dates from the date string -- this could be improved
      function parse_date(date_string) {
        var d = new Date(date_string);
        return d.toLocaleDateString();
      }

    } // End of add_meta_box_post_content() */

    e.preventDefault();
    return false;
  });

  // Load posts in the editor
  $('#discourse-fetch').on('click', '.load-posts', function(e) {
    var output = '';
//          var num_posts_selected = $('.post-select').find('.post-select-box:checked').length;
    var num_pages;
    // An array of all the selected .topic-post divs
    var selected_topic_posts = [];
    // If there are less than 30 posts, load them in the editor -- this value should be configurable.
    var page_num, post_num, topic = [], content;
    var num_posts_selected;

    $.each($('.post-select'), function() {
      if ($(this).find('.post-select-box').prop('checked'));
      selected_topic_posts.push($(this).find('.topic-post').html());
    });


    num_posts_selected = selected_topic_posts.length;
    if (num_posts_selected < 40) {

      output += '<section class="discourse-topic">';
      selected_topic_posts.forEach(function(post_content) {
        output += '<div class="discourse-post">' + post_content + '</div>';
      });

      output += '</section>';
      $('#content').html(output);

    } else { // There are more than 20 posts. We will paginate at 20 posts/page.
      num_pages = Math.ceil(num_posts_selected / 40.0);
      $('#discourse-message').html('<div class="warn">You have selected ' + num_posts_selected + ' posts in this topic. For improved readability, those posts will be published over ' + num_pages + ' pages.</div>');
      // Create an array of pages
      output = selected_topic_posts.splice(0, 30).join('');
      $('#content').html('<h2>Menu for: ' + $('#title').val() + '</h2>');

      for (page_num = 0; page_num <= num_pages; page_num++) {
        content = selected_topic_posts.splice(0, 30).join('');

        topic = {
          'title': $('#title').val() + ' (page ' + (page_num + 1) + ')',
          'slug': slug($('#title').val() + ' ' + page_num),
          'author_id': 1,
          'content': content,
          'post_status': 'publish',
          'post_type': 'post',
          'action': 'create_post'
        };

        $.post(ajaxurl, topic, function(response) {
          console.log('we got a response', response);
        });

      }
    }
    e.preventDefault();
  });

  // Toggle select/un-select all posts
  $('#discourse-fetch').on('change', '.post-select-toggle', function() {
    if ($(this).hasClass('unselect')) {
      $(this).toggleClass('unselect select');
      $('.post-select-box').attr('checked', false);
    } else {
      $(this).toggleClass('select unselect');
      $('.post-select-box').attr('checked', true);
    }
  });

  // Clear the message box and remove its classes when $target is clicked.
  function clear_message_on_click($target) {
    $target.click(function() {
      $('#discourse-message').html('').removeClass();
    });
  }

  // Utility functions

  function set_title(response) {
    if ($('#title').val() === '') {
      $('#title-prompt-text').css('display', 'none');
      $('#title').val(response['title']);
    }
  }

  function get_base_url(url) {
    var tmp = document.createElement('a'),
      host,
      protocol,
      topic_id;

    tmp.href = url;
    host = tmp.hostname;
    protocol = tmp.protocol;
    topic_id = get_topic_id(url);

    return protocol + '//' + host + '/t/' + topic_id;
  }

  //function get_topic_path(url) {
  //  var tmp = document.createElement('a'),
  //    path_name,
  //    path_parts;
  //
  //  tmp.href = url;
  //  path_name = tmp.pathname;
  //  path_parts = path_name.split('/');
  //  return '/' + path_parts[1] + '/' + path_parts[3] + '/';
  //}

  function get_url_path(url) {
    var tmp = document.createElement('a');
    tmp.href = url;
    return tmp.pathname;
  }

  function is_url(txt) {
    var url_pattern = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i;
    return url_pattern.test(txt);
  }

  function get_topic_id(url) {
    var path = get_url_path(url),
        topic_path_pattern = /^\/t\/[\d\w\-]+\/(\d+)\/?(\d+)?$/,
        match;
    match = topic_path_pattern.exec(path);
    if (match) {
      return match[1];
    } else {
      return null;
    }
  }


  function slug(str) {
    return str
      .toLowerCase()
      .replace(/ /g,'-')
      .replace(/[^\w-]+/g,'');
  }

});