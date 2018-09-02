$(document).ready(function(){
    $("div button.delete").hover(function(){
        $(this).fadeTo(1,1);
        }, function(){
        $(this).fadeTo(1,0);
    });
});