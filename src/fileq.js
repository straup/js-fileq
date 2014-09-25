// See also: http://www.aaronland.info/weblog/2014/09/22/desire/#upload

function fileq_file(file){

    // this assumes a File thingy
    // https://developer.mozilla.org/en-US/docs/Web/API/File

    try {
	var reader = new FileReader();
	    
	reader.onload = function(evt){
		
	    var data_uri = evt.target.result;
	    
	    var dt = new Date();
	    var pending_id = window.btoa(dt.toISOString());
	    
	    var pending_key = "fileq_pending_" + pending_id;
	    
	    localforage.setItem(pending_key, data_uri, function(rsp){
		fileq_debug("set " + pending_key);
		fileq_process_pending(pending_id);
	    });
	};
	
	reader.readAsDataURL(file)
    }
    
    catch(e){
	
	fileq_error("Hrm, there was a problem uploading your file.", e);
	return false;
    }
    
    return true;
}

function fileq_clear_processing(){

    var re = /fileq_processing_(.*)/;

    var on_match = function(m){
	localforage.removeItem(m[0], function(){
	    fileq_debug("unset " + m[0]);
	});
    };

    fileq_iter_keys(re, on_match);
}

function fileq_process_pending(){

    var re = /fileq_pending_(.*)/;

    var on_match = function(m){
	fileq_process_pending_id(m[1]);
    }

    fileq_iter_keys(re, on_match);
}

function fileq_process_pending_id(pending_id){
    
    var pending_key = "fileq_pending_" + pending_id;
    var processing_key = "fileq_processing_" + pending_id;
    
    localforage.getItem(processing_key, function(rsp){

	if (rsp){
	    fileq_debug("got processing key, so skipping");
	    return;
	}

	var dt = new Date();
	var ts = dt.getTime();

	localforage.setItem(processing_key, ts, function(rsp){

	    fileq_debug("set " + processing_key + ", to " + ts);

	    localforage.getItem(pending_key, function(data_uri){

		fileq_debug("got data uri for " + pending_key);

		try {
		    var blob = fileq_data_uri_to_blob(data_uri);
		}
		
		catch(e){
		    fileq_error("failed to create a blob for " + pending_key + ", because " + e);
		    return false;
		}

		fileq_do_upload(blob, pending_id);
	    });

	});

    });
}

function fileq_do_upload(file, pending_id){

    fileq_debug("do upload for " + pending_id);

    var data = new FormData();
    data.append('photo', file);

    var on_success = function(rsp){

	fileq_debug(rsp);
	
	var processing_key = "fileq_" + pending_id;
	var pending_key = "fileq_" + pending_id;
	    
	localforage.removeItem(pending_key, function(rsp){
	    
	    fileq_debug("removed " + pending_key);
	    
	    localforage.removeItem(processing_key, function(rsp){
		fileq_debug("removed " + processing_key);
	    });
	    
	});

    };
    
    var on_error = function(rsp){

	fileq_error(rsp);

	var processing_key = "processing_" + pending_id;
	
	localforage.removeItem(processing_key, function(rsp){
	    fileq_debug("removed " + processing_key);
	});

	var details = '';
	
	try {
	    var rsp = JSON.parse(rsp['responseText']);
	    details = rsp['error']['message'];

	    fileq_error(details);
	}
	
	catch(e){
	    fileq_log(e);
	}	
    };
        
    $.ajax({
	url: 'https://upload.example.com/',
	type: "POST",
	data: data,
	cache: false,
	contentType: false,
	processData: false,
	dataType: "json",
	success: on_success,
	error: on_error,
    });
    
    return false;
}

// http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata

function fileq_data_uri_to_blob(data_uri){

    // convert base64/URLEncoded data component to raw binary data held in a string

    var byteString;

    if (data_uri.split(',')[0].indexOf('base64') >= 0){
        byteString = atob(data_uri.split(',')[1]);
    }

    else {
        byteString = unescape(data_uri.split(',')[1]);
    }
    
    // separate out the mime component
    var mimeString = data_uri.split(',')[0].split(':')[1].split(';')[0]

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);

    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}

function fileq_iter_keys(re, on_match){

    localforage.keys(function(rsp){
	
	var count = rsp.length;
	
	for (var i=0; i < count; i++){
	    
	    var m = rsp[i].match(re);

	    if (m){
		on_match(m);
	    }
	}
    });

}

function fileq_debug(msg){
    console.log(msg);
}

function fileq_info(msg){
    console.log(msg);
}

function fileq_error(msg){
    console.log(msg);
}

