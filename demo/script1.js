document.body.addEventListener('click', function(e) {
    e.preventDefault();
    function doSomethingElse(foo) {
        return foo+1;
    }
    doSomethingElse();
})